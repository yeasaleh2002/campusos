import type { KnowledgeCategory } from "@/generated/prisma/enums";
import type { ConfidenceLevel } from "@/server/chatbot/confidence";

/**
 * Template answers composed ONLY from stored knowledge-base text (pure). Nothing
 * here generates facts: every sentence is either a stored answer, a stored
 * question title, or fixed product copy.
 */

export interface RankedEntry {
  id: string;
  category: KnowledgeCategory;
  question: string;
  answer: string;
  isSample: boolean;
  confidence: number;
}

export interface AnswerSource {
  id: string;
  title: string;
  category: KnowledgeCategory;
  link: string;
}

export interface Suggestion {
  id: string;
  question: string;
  link: string;
}

export interface ComposedAnswer {
  answer: string;
  sources: AnswerSource[];
  suggestions: Suggestion[];
}

export const REFUSAL_TEXT =
  "I don't have verified information about this yet. I've logged your question so the CampusOS team can add an answer.";
export const SAMPLE_NOTE = "Note: this answer is from sample data and must be verified with the relevant office.";

/** App page most relevant to a knowledge-base category. */
const CATEGORY_PAGES: Partial<Record<KnowledgeCategory, string>> = {
  BUS: "/bus",
  EXAM: "/notices?category=EXAM",
};

export function entryLink(entry: Pick<RankedEntry, "id" | "category">): string {
  return CATEGORY_PAGES[entry.category] ?? `/helpdesk/${entry.id}`;
}

const toSource = (entry: RankedEntry): AnswerSource => ({
  id: entry.id,
  title: entry.question,
  category: entry.category,
  link: entryLink(entry),
});

const toSuggestion = (entry: RankedEntry): Suggestion => ({ id: entry.id, question: entry.question, link: `/helpdesk/${entry.id}` });

/** Related entries close enough in confidence to the best one to be worth listing. */
const RELATED_RATIO = 0.9;

export function composeKnowledgeAnswer(level: ConfidenceLevel, ranked: RankedEntry[]): ComposedAnswer {
  const [top, ...rest] = ranked;
  if (level === "LOW" || !top) {
    return { answer: REFUSAL_TEXT, sources: [], suggestions: ranked.slice(0, 3).map(toSuggestion) };
  }

  const note = top.isSample ? `\n\n${SAMPLE_NOTE}` : "";
  if (level === "HIGH") {
    const related = rest.filter((entry) => entry.confidence >= top.confidence * RELATED_RATIO).slice(0, 1);
    return {
      answer: `${top.answer}${note}`,
      sources: [top, ...related].map(toSource),
      suggestions: related.map(toSuggestion),
    };
  }

  // MEDIUM: answer from the best match, but say so, and offer alternatives.
  const alternatives = rest.slice(0, 3);
  const didYouMean = alternatives.length ? `\n\nDid you mean: ${alternatives.map((entry) => `"${entry.question}"`).join(", ")}?` : "";
  return {
    answer: `This might help (closest match: "${top.question}"):\n${top.answer}${note}${didYouMean}`,
    sources: [toSource(top)],
    suggestions: alternatives.map(toSuggestion),
  };
}
