import { Prisma } from "@/generated/prisma/client";
import type { KnowledgeCategory } from "@/generated/prisma/enums";

/**
 * Knowledge-base retrieval query (pure builder). Combines:
 *  - Postgres full-text: ts_rank_cd over the generated tsvector, against an OR of
 *    plainto_tsquery per search term (plainto never parses operators from user text)
 *  - pg_trgm word_similarity between the question text and the entry question
 *  - keyword array overlap with the canonical search terms
 * User input only ever appears in `values` - never in the SQL text.
 */

export interface KnowledgeQueryInput {
  text: string;
  terms: string[];
  category?: KnowledgeCategory;
  limit: number;
}

export interface KnowledgeRow {
  id: string;
  category: KnowledgeCategory;
  question: string;
  answer: string;
  keywords: string[];
  isSample: boolean;
  sourceType: string;
  updatedAt: Date;
  fts: number;
  trigram: number;
  keywordOverlap: number;
}

const TRIGRAM_FLOOR = 0.3;

export function buildKnowledgeQuery(input: KnowledgeQueryInput): Prisma.Sql {
  const terms = input.terms.length ? input.terms : [input.text];
  const tsQuery = Prisma.join(terms.map((term) => Prisma.sql`plainto_tsquery('english', ${term})`), " || ");
  const categoryFilter = input.category ? Prisma.sql`AND k.category::text = ${input.category}` : Prisma.empty;

  return Prisma.sql`
    WITH q AS (SELECT (${tsQuery}) AS query)
    SELECT k.id, k.category::text AS category, k.question, k.answer, k.keywords, k."isSample",
           k."sourceType"::text AS "sourceType", k."updatedAt",
           ts_rank_cd(k."searchVector", q.query, 32)::float8 AS fts,
           word_similarity(${input.text}, k.question)::float8 AS trigram,
           cardinality(ARRAY(SELECT unnest(k.keywords) INTERSECT SELECT unnest(${terms}::text[])))::int AS "keywordOverlap"
    FROM "KnowledgeEntry" k, q
    WHERE k."isPublished" AND k."deletedAt" IS NULL ${categoryFilter}
      AND (k."searchVector" @@ q.query
           OR word_similarity(${input.text}, k.question) > ${TRIGRAM_FLOOR}
           OR k.keywords && ${terms}::text[])
    ORDER BY (2 * ts_rank_cd(k."searchVector", q.query, 32)
              + word_similarity(${input.text}, k.question)
              + 0.2 * cardinality(ARRAY(SELECT unnest(k.keywords) INTERSECT SELECT unnest(${terms}::text[])))) DESC,
             k.id
    LIMIT ${input.limit}`;
}
