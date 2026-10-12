import { cleanText } from "@/server/chatbot/normalize";
import { SYNONYMS } from "@/config/chatbot-synonyms";

/**
 * Confidence scoring for knowledge-base retrieval (pure). Each candidate row
 * comes from SQL with raw signals; the final confidence blends them with the
 * share of the user's meaning units the entry actually covers, so off-topic
 * questions that only share a filler word stay LOW.
 */

export const HIGH_CONFIDENCE = 0.5;
export const MEDIUM_CONFIDENCE = 0.3;

export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW";

export interface RetrievalSignals {
  /** ts_rank_cd with normalisation 32 → 0..1 */
  fts: number;
  /** pg_trgm word_similarity(query, question) → 0..1 */
  trigram: number;
  /** Number of query terms present in the entry's keywords array. */
  keywordOverlap: number;
}

export interface ScoredText {
  question: string;
  answer: string;
  keywords: string[];
}

/** Share of meaning units (concepts or raw words) found in the entry text. */
export function coverage(units: string[], entry: ScoredText): number {
  if (units.length === 0) return 0;
  const haystack = ` ${cleanText(`${entry.question} ${entry.keywords.join(" ")} ${entry.answer}`)} `;
  const covered = units.filter((unit) => {
    const concept = SYNONYMS[unit];
    const needles = concept ? [...concept.terms, ...concept.variants] : [unit];
    return needles.some((needle) => haystack.includes(` ${needle} `) || (needle.length >= 5 && haystack.includes(needle)));
  });
  return covered.length / units.length;
}

/** An entry must address at least this share of the question's meaning units. */
export const MIN_COVERAGE = 0.34;

/** Blended 0..1 confidence for one candidate. */
export function confidenceScore(signals: RetrievalSignals, coverageRatio: number): number {
  const overlap = Math.min(1, signals.keywordOverlap / 2);
  const raw = 0.3 * Math.min(1, signals.fts * 2) + 0.2 * signals.trigram + 0.15 * overlap + 0.35 * coverageRatio;
  // Lexical evidence AND enough coverage are both required to claim an answer:
  // matching one incidental word ("previous") must not look like an answer.
  const evidence = signals.fts > 0 || signals.keywordOverlap > 0 || signals.trigram >= 0.45;
  const capped = evidence && coverageRatio >= MIN_COVERAGE ? raw : Math.min(raw, MEDIUM_CONFIDENCE - 0.01);
  return Number(capped.toFixed(4));
}

const QUESTION_FORMS: Record<string, RegExp> = { when: /^when\b/i, where: /^where\b/i, how: /^how\b/i };
const QUESTION_FORM_BONUS = 0.08;

/**
 * Small ranking bonus when the user's question form (when/where/how, in any of
 * the supported languages) matches how the FAQ entry is phrased.
 */
export function questionFormBonus(concepts: ReadonlySet<string>, entryQuestion: string): number {
  return Object.entries(QUESTION_FORMS).some(([form, pattern]) => concepts.has(form) && pattern.test(entryQuestion)) ? QUESTION_FORM_BONUS : 0;
}

export function confidenceLevel(score: number): ConfidenceLevel {
  if (score >= HIGH_CONFIDENCE) return "HIGH";
  if (score >= MEDIUM_CONFIDENCE) return "MEDIUM";
  return "LOW";
}
