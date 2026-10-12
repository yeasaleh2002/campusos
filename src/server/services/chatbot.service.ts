import { nanoid } from "nanoid";
import type { Prisma } from "@/generated/prisma/client";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import {
  type AnswerSource,
  composeKnowledgeAnswer,
  type RankedEntry,
  SAMPLE_NOTE,
  type Suggestion,
} from "@/server/chatbot/compose";
import { type ConfidenceLevel, confidenceLevel, confidenceScore, coverage, MEDIUM_CONFIDENCE, questionFormBonus } from "@/server/chatbot/confidence";
import { detectIntent } from "@/server/chatbot/intents";
import { normalizeMessage } from "@/server/chatbot/normalize";
import type { AuthUser } from "@/server/middleware/auth";
import { retrieveKnowledge } from "@/server/queries/helpdesk.queries";
import { answerIntent } from "@/server/services/chatbot-intents.service";
import { audit } from "@/server/services/audit.service";
import { getLlmProvider } from "@/server/services/llm.service";

const SESSION_TOKEN_LENGTH = 32;
const LLM_TIMEOUT_MS = 3_000;
const LLM_CONTEXT_ENTRIES = 3;

export type AnsweredBy = "intent" | "knowledge_base" | "llm" | "fallback";

export interface ChatReply {
  sessionId: string;
  messageId: string;
  answer: string;
  level: ConfidenceLevel;
  confidence: number;
  intent: string | null;
  answeredBy: AnsweredBy;
  sources: AnswerSource[];
  suggestions: Suggestion[];
}

interface DraftReply {
  answer: string;
  level: ConfidenceLevel;
  confidence: number;
  intent: string | null;
  answeredBy: AnsweredBy;
  sources: AnswerSource[];
  suggestions: Suggestion[];
  matchedEntryIds: string[];
}

/** Session owned by `user` (or anonymous). Foreign sessions look like missing ones. */
async function loadSession(token: string, user: AuthUser | null) {
  const session = await prisma.chatSession.findUnique({ where: { token }, select: { id: true, token: true, userId: true } });
  if (!session || (session.userId !== null && session.userId !== user?.id)) throw new NotFoundError("Chat session not found.");
  return session;
}

/**
 * Ranks retrieved rows by blended confidence (signals + coverage of the user's
 * meaning units), nudged towards entries phrased like the question (when/where/how).
 */
function rank(rows: Awaited<ReturnType<typeof retrieveKnowledge>>, message: ReturnType<typeof normalizeMessage>): RankedEntry[] {
  return rows
    .map((row) => {
      const base = confidenceScore({ fts: row.fts, trigram: row.trigram, keywordOverlap: row.keywordOverlap }, coverage(message.units, row));
      const bonus = base >= MEDIUM_CONFIDENCE ? questionFormBonus(message.concepts, row.question) : 0;
      return {
        id: row.id,
        category: row.category,
        question: row.question,
        answer: row.answer,
        isSample: row.isSample,
        confidence: Number(Math.min(1, base + bonus).toFixed(4)),
      };
    })
    .sort((a, b) => b.confidence - a.confidence);
}

async function answerFromKnowledgeBase(rawQuestion: string, message: ReturnType<typeof normalizeMessage>): Promise<DraftReply> {
  const ranked = rank(await retrieveKnowledge(message.text, message.searchTerms), message);
  const confidence = ranked[0]?.confidence ?? 0;
  const level = confidenceLevel(confidence);
  const composed = composeKnowledgeAnswer(level, ranked);
  const draft: DraftReply = {
    ...composed,
    level,
    confidence,
    intent: null,
    answeredBy: level === "LOW" ? "fallback" : "knowledge_base",
    matchedEntryIds: level === "LOW" ? [] : composed.sources.map((source) => source.id),
  };

  // Optional LLM: only rephrases entries we already trust; never used for LOW.
  const llm = getLlmProvider();
  if (level === "LOW" || !llm) return draft;
  const context = ranked.slice(0, level === "HIGH" ? LLM_CONTEXT_ENTRIES : 1).map((entry) => ({ title: entry.question, content: entry.answer }));
  const rephrased = await llm.groundedAnswer({ question: rawQuestion, context, timeoutMs: LLM_TIMEOUT_MS });
  if (!rephrased) return draft;
  return { ...draft, answer: ranked[0].isSample ? `${rephrased}\n\n${SAMPLE_NOTE}` : rephrased, answeredBy: "llm" };
}

/**
 * Answers a chat message ONLY from CampusOS data:
 *  1. deterministic intents (bus times, forms, events, cancellations) from live tables;
 *  2. otherwise knowledge-base retrieval (full-text + trigram + keywords) with a
 *     confidence score - HIGH answers, MEDIUM answers with "did you mean",
 *     LOW refuses and logs the question for admins.
 * User text is never executed or concatenated into SQL.
 */
export async function handleChatMessage(input: { sessionId?: string; message: string }, user: AuthUser | null): Promise<ChatReply> {
  const session = input.sessionId
    ? await loadSession(input.sessionId, user)
    : await prisma.chatSession.create({ data: { token: nanoid(SESSION_TOKEN_LENGTH), userId: user?.id ?? null }, select: { id: true, token: true, userId: true } });

  const message = normalizeMessage(input.message);
  let draft: DraftReply | null = null;
  const detected = message.text ? detectIntent(message) : null;
  if (detected) {
    const intentAnswer = await answerIntent(detected);
    if (intentAnswer) {
      draft = { ...intentAnswer, level: "HIGH", confidence: 1, answeredBy: "intent", suggestions: [], matchedEntryIds: [] };
    }
  }
  draft ??= await answerFromKnowledgeBase(input.message, message);

  const answered = draft.level !== "LOW";
  const now = Date.now();
  const [, assistant] = await prisma.$transaction([
    prisma.chatMessage.create({
      data: { sessionId: session.id, userId: user?.id ?? null, role: "USER", content: input.message, isAnswered: answered, createdAt: new Date(now) },
      select: { id: true },
    }),
    prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: "ASSISTANT",
        content: draft.answer,
        matchedEntryIds: draft.matchedEntryIds,
        confidence: draft.confidence,
        isAnswered: answered,
        intent: draft.intent,
        createdAt: new Date(now + 1),
      },
      select: { id: true },
    }),
    prisma.chatSession.update({ where: { id: session.id }, data: { messageCount: { increment: 2 }, lastMessageAt: new Date(now + 1) }, select: { id: true } }),
  ]);

  return {
    sessionId: session.token,
    messageId: assistant.id,
    answer: draft.answer,
    level: draft.level,
    confidence: draft.confidence,
    intent: draft.intent,
    answeredBy: draft.answeredBy,
    sources: draft.sources,
    suggestions: draft.suggestions,
  };
}

const MAX_HISTORY = 50;

/** A session's latest messages, oldest first (owner or anonymous-token holder only). */
export async function getChatSession(token: string, user: AuthUser | null) {
  const session = await loadSession(token, user);
  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    select: { id: true, role: true, content: true, confidence: true, intent: true, feedback: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: MAX_HISTORY,
  });
  return { sessionId: session.token, messages: messages.reverse() };
}

/** Thumbs up/down on an assistant message (latest vote wins). */
export async function recordFeedback(messageId: string, input: { sessionId: string; helpful: boolean }, user: AuthUser | null): Promise<void> {
  const session = await loadSession(input.sessionId, user);
  const updated = await prisma.chatMessage.updateMany({
    where: { id: messageId, sessionId: session.id, role: "ASSISTANT" },
    data: { feedback: input.helpful ? "HELPFUL" : "NOT_HELPFUL", feedbackAt: new Date() },
  });
  if (updated.count === 0) throw new NotFoundError("Message not found.");
}

export interface GapItem {
  id: string;
  question: string;
  answer: string | null;
  confidence: number | null;
  createdAt: Date;
}

/**
 * Knowledge gaps for admins: questions the bot couldn't answer, or answers users
 * marked unhelpful (paired with the question that prompted them, in one extra query).
 */
export async function listKnowledgeGaps(type: "unanswered" | "unhelpful", query: { cursor?: string; limit: number }): Promise<Page<GapItem>> {
  const page = { take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}) };
  const order: Prisma.ChatMessageOrderByWithRelationInput[] = [{ createdAt: "desc" }, { id: "desc" }];

  if (type === "unanswered") {
    const rows = await prisma.chatMessage.findMany({
      where: { role: "USER", isAnswered: false },
      select: { id: true, content: true, createdAt: true },
      orderBy: order,
      ...page,
    });
    return toPage(rows.map((row) => ({ id: row.id, question: row.content, answer: null, confidence: null, createdAt: row.createdAt })), query.limit, (row) => row.id);
  }

  const answers = await prisma.chatMessage.findMany({
    where: { role: "ASSISTANT", feedback: "NOT_HELPFUL" },
    select: { id: true, sessionId: true, content: true, confidence: true, createdAt: true },
    orderBy: order,
    ...page,
  });
  const questions = await prisma.chatMessage.findMany({
    where: { role: "USER", sessionId: { in: [...new Set(answers.map((a) => a.sessionId))] } },
    select: { sessionId: true, content: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const items = answers.map((answer) => ({
    id: answer.id,
    question: questions.find((q) => q.sessionId === answer.sessionId && q.createdAt <= answer.createdAt)?.content ?? "",
    answer: answer.content,
    confidence: answer.confidence,
    createdAt: answer.createdAt,
  }));
  return toPage(items, query.limit, (row) => row.id);
}

export interface ChatbotAnalytics {
  totals: { questions: number; answered: number; unanswered: number; helpful: number; notHelpful: number };
  /** Assistant answers bucketed by retrieval confidence (0-20%, ..., 80-100%). */
  confidence: Array<{ bucket: string; count: number }>;
  topIntents: Array<{ intent: string; count: number }>;
}

/** Aggregates over the last 30 days; index-friendly (createdAt / feedback / isAnswered). */
export async function getChatbotAnalytics(): Promise<ChatbotAnalytics> {
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
  const [questions, unanswered, helpful, notHelpful, buckets, intents] = await Promise.all([
    prisma.chatMessage.count({ where: { role: "USER", createdAt: { gte: since } } }),
    prisma.chatMessage.count({ where: { role: "USER", isAnswered: false, createdAt: { gte: since } } }),
    prisma.chatMessage.count({ where: { role: "ASSISTANT", feedback: "HELPFUL", createdAt: { gte: since } } }),
    prisma.chatMessage.count({ where: { role: "ASSISTANT", feedback: "NOT_HELPFUL", createdAt: { gte: since } } }),
    prisma.$queryRaw<Array<{ bucket: number; count: number }>>`
      SELECT LEAST(floor("confidence" * 5), 4)::int AS bucket, count(*)::int AS count
      FROM "ChatMessage" WHERE "role" = 'ASSISTANT' AND "confidence" IS NOT NULL AND "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`,
    prisma.chatMessage.groupBy({
      by: ["intent"],
      where: { role: "ASSISTANT", intent: { not: null }, createdAt: { gte: since } },
      _count: { _all: true },
      orderBy: { _count: { intent: "desc" } },
      take: 6,
    }),
  ]);
  const labels = ["0-20%", "20-40%", "40-60%", "60-80%", "80-100%"];
  return {
    totals: { questions, answered: questions - unanswered, unanswered, helpful, notHelpful },
    confidence: labels.map((bucket, index) => ({ bucket, count: buckets.find((row) => row.bucket === index)?.count ?? 0 })),
    topIntents: intents.flatMap((row) => (row.intent ? [{ intent: row.intent, count: row._count._all }] : [])),
  };
}

/**
 * Marks an unanswered question as handled (e.g. after a KB entry was written for it) so it
 * leaves the inbox. Idempotent: resolving twice is a no-op.
 */
export async function resolveKnowledgeGap(actor: AuthUser, messageId: string, request: Request): Promise<void> {
  const message = await prisma.chatMessage.findFirst({ where: { id: messageId, role: "USER" }, select: { id: true } });
  if (!message) throw new NotFoundError("Question not found.");
  await prisma.chatMessage.updateMany({ where: { id: messageId, isAnswered: false }, data: { isAnswered: true } });
  await audit(actor, "chatbot.gap_resolve", { type: "ChatMessage", id: messageId }, undefined, request);
}
