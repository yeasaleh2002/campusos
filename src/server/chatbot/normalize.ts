import { STOPWORDS, SYNONYMS } from "@/config/chatbot-synonyms";

export const MAX_MESSAGE_LENGTH = 500;
const MAX_SEARCH_TERMS = 16;

export interface NormalizedMessage {
  /** Lower-cased, punctuation-free, whitespace-collapsed text (safe to log/compare). */
  text: string;
  /** Meaningful tokens (stopwords removed). */
  tokens: string[];
  /** Synonym concepts detected (keys of SYNONYMS). */
  concepts: Set<string>;
  /** English search terms: canonical concept terms + remaining tokens. */
  searchTerms: string[];
  /** Distinct meaning units used to measure coverage (concepts + unmapped tokens). */
  units: string[];
}

/** Lower-case, NFKC, strip punctuation (keeps Bangla letters + combining marks). */
export function cleanText(raw: string): string {
  return raw
    .slice(0, MAX_MESSAGE_LENGTH)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const variantIndex: Array<{ variant: string; concept: string; phrase: boolean }> = Object.entries(SYNONYMS)
  .flatMap(([concept, { variants }]) =>
    variants.map((variant) => ({ variant: variant.normalize("NFKC"), concept, phrase: variant.includes(" ") })),
  )
  // Longest first so "last date" wins over "date".
  .sort((a, b) => b.variant.length - a.variant.length);

const singleWordVariants = new Map(variantIndex.filter((v) => !v.phrase).map((v) => [v.variant, v.concept]));

/** The synonym concept a single word belongs to, if any. */
export function conceptOf(word: string): string | undefined {
  return singleWordVariants.get(word);
}

/**
 * Normalises a chat message and maps Bangla/Banglish/English vocabulary onto
 * canonical English concepts. Pure - no I/O.
 */
export function normalizeMessage(raw: string): NormalizedMessage {
  let text = cleanText(raw);
  const concepts = new Set<string>();

  // Phrase variants first ("last date", "id card"), removed so their words aren't double counted.
  let remainder = ` ${text} `;
  for (const { variant, concept, phrase } of variantIndex) {
    if (phrase && remainder.includes(` ${variant} `)) {
      concepts.add(concept);
      remainder = remainder.replaceAll(` ${variant} `, " ");
    }
  }

  const unmapped: string[] = [];
  const tokens: string[] = [];
  for (const word of remainder.split(" ").filter(Boolean)) {
    const concept = singleWordVariants.get(word);
    if (concept) concepts.add(concept);
    if (STOPWORDS.has(word)) continue;
    tokens.push(word);
    if (!concept && word.length >= 2) unmapped.push(word);
  }
  text = text.slice(0, MAX_MESSAGE_LENGTH);

  const conceptTerms = [...concepts].flatMap((concept) => SYNONYMS[concept].terms);
  const searchTerms = [...new Set([...conceptTerms, ...unmapped])].slice(0, MAX_SEARCH_TERMS);
  // "when" has no search terms - it's a question word, not a topic.
  const units = [...new Set([...[...concepts].filter((c) => SYNONYMS[c].terms.length > 0), ...unmapped])];
  return { text, tokens, concepts, searchTerms, units };
}
