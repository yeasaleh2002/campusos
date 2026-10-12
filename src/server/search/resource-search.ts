import { Prisma } from "@/generated/prisma/client";
import type { ResourceType } from "@/generated/prisma/enums";

/**
 * Builds the Resource Hub search/list query. Pure: returns a parameterised
 * Prisma.Sql (user input only ever appears in `values`, never in the SQL text).
 *
 * Matching (any of):
 *  - full-text: weighted tsvector (title/tags A, description B) against the
 *    query and its synonym expansions ("prev" → "previous", "ques" → "question")
 *  - trigram: word_similarity(query, title) for typos ("algoritm" → "Algorithms")
 *  - course code: punctuation-insensitive ("CSE 2101" = "cse-2101" = "CSE2101")
 * Ranking: strict full-text match > any-term match > title similarity > course hit.
 * Pagination: keyset on (sortValue, id), never OFFSET.
 */

export const RESOURCE_SORTS = ["relevance", "newest", "popular"] as const;
export type ResourceSort = (typeof RESOURCE_SORTS)[number];

export interface ResourceSearchCursor {
  /** Sort value of the last row (score, ISO createdAt, or downloadCount). */
  v: number | string;
  id: string;
}

export interface ResourceSearchParams {
  q?: string;
  departmentId?: string;
  courseId?: string;
  semester?: number;
  year?: number;
  type?: ResourceType;
  sort: ResourceSort;
  cursor?: ResourceSearchCursor | null;
  limit: number;
}

/** Campus shorthand and course acronyms → full words, so student phrasing still hits the tsvector. */
const SYNONYMS: Record<string, string> = {
  dbms: "database management",
  db: "database",
  os: "operating systems",
  ai: "artificial intelligence",
  ml: "machine learning",
  ds: "data structures",
  dsa: "data structures algorithms",
  algo: "algorithms",
  oop: "object oriented programming",
  cn: "computer networks",
  dld: "digital logic design",
  dsp: "digital signal processing",
  hrm: "human resource management",
  elt: "english language teaching",
  qc: "quality control",
  prev: "previous",
  pyq: "previous question",
  ques: "question",
  qus: "question",
  qn: "question",
  qp: "question paper",
  ct: "class test",
  mid: "midterm",
  sem: "semester",
  lab: "lab manual",
  note: "notes",
  sheet: "notes",
  slide: "slides",
  assign: "assignment",
};

const MAX_TERMS = 12;
const TRIGRAM_THRESHOLD = 0.35;

export interface NormalisedQuery {
  /** Trimmed, whitespace-collapsed original. */
  text: string;
  /** Distinct words + synonym expansions, used for the any-term match. */
  terms: string[];
  /** Lower-case alphanumerics only, for course-code matching ("cse2101"). */
  compact: string;
  /** Whether `compact` looks like a course code (letters followed by digits). */
  looksLikeCourseCode: boolean;
}

export function normaliseQuery(raw: string): NormalisedQuery {
  const text = raw.trim().replace(/\s+/g, " ").slice(0, 100);
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const expanded = words.flatMap((word) => [word, ...(SYNONYMS[word]?.split(" ") ?? [])]);
  const compact = words.join("");
  return {
    text,
    terms: [...new Set(expanded)].slice(0, MAX_TERMS),
    compact,
    looksLikeCourseCode: /^[a-z]{2,5}\d{3,4}[a-z]?$/.test(compact),
  };
}

function filterConditions(params: ResourceSearchParams): Prisma.Sql[] {
  const conditions: Prisma.Sql[] = [Prisma.sql`r.status::text = 'APPROVED'`, Prisma.sql`r."deletedAt" IS NULL`];
  if (params.departmentId) conditions.push(Prisma.sql`r."departmentId" = ${params.departmentId}`);
  if (params.courseId) conditions.push(Prisma.sql`r."courseId" = ${params.courseId}`);
  if (params.semester !== undefined) conditions.push(Prisma.sql`r.semester = ${params.semester}`);
  if (params.year !== undefined) conditions.push(Prisma.sql`r.year = ${params.year}`);
  if (params.type) conditions.push(Prisma.sql`r.type::text = ${params.type}`);
  return conditions;
}

/** OR of plainto_tsquery per term - plainto never parses operators from user text. */
function anyTermQuery(terms: string[]): Prisma.Sql {
  return Prisma.join(terms.map((term) => Prisma.sql`plainto_tsquery('english', ${term})`), " || ");
}

const COMPACT_COURSE_CODE = Prisma.sql`regexp_replace(lower(c.code), '[^a-z0-9]', '', 'g')`;

function searchParts(query: NormalisedQuery): { match: Prisma.Sql; score: Prisma.Sql } {
  const strict = Prisma.sql`websearch_to_tsquery('english', ${query.text})`;
  const anyTerm = anyTermQuery(query.terms.length ? query.terms : [query.text]);
  const courseHit = query.looksLikeCourseCode
    ? Prisma.sql`(c.code IS NOT NULL AND ${COMPACT_COURSE_CODE} LIKE ${`${query.compact}%`})`
    : Prisma.sql`FALSE`;

  const match = Prisma.sql`(
    r."searchVector" @@ (${anyTerm})
    OR word_similarity(${query.text}, r.title) > ${TRIGRAM_THRESHOLD}
    OR ${courseHit}
    OR (c.code IS NOT NULL AND c.title ILIKE ${`%${query.text}%`})
  )`;
  const score = Prisma.sql`ROUND((
      2 * ts_rank(r."searchVector", ${strict})
    + ts_rank(r."searchVector", (${anyTerm}))
    + word_similarity(${query.text}, r.title)
    + CASE WHEN ${courseHit} THEN 1 ELSE 0 END
  )::numeric, 6)::float8`;
  return { match, score };
}

function sortColumn(sort: ResourceSort): Prisma.Sql {
  if (sort === "relevance") return Prisma.sql`score`;
  if (sort === "popular") return Prisma.sql`"downloadCount"`;
  return Prisma.sql`"createdAt"`;
}

function cursorCondition(sort: ResourceSort, cursor: ResourceSearchCursor | null | undefined): Prisma.Sql {
  if (!cursor) return Prisma.sql`TRUE`;
  if (sort === "newest") return Prisma.sql`("createdAt", id) < (${String(cursor.v)}::timestamp(3), ${cursor.id})`;
  if (sort === "popular") return Prisma.sql`("downloadCount", id) < (${Number(cursor.v)}::int, ${cursor.id})`;
  return Prisma.sql`(score, id) < (${Number(cursor.v)}::float8, ${cursor.id})`;
}

/** Relevance sort without a query falls back to newest. */
export function effectiveSort(params: Pick<ResourceSearchParams, "q" | "sort">): ResourceSort {
  return params.sort === "relevance" && !params.q?.trim() ? "newest" : params.sort;
}

export function buildResourceSearchQuery(params: ResourceSearchParams): Prisma.Sql {
  const sort = effectiveSort(params);
  const conditions = filterConditions(params);
  let score = Prisma.sql`0::float8`;

  if (params.q?.trim()) {
    const parts = searchParts(normaliseQuery(params.q));
    conditions.push(parts.match);
    score = parts.score;
  }
  const column = sortColumn(sort);

  return Prisma.sql`
    WITH ranked AS (
      SELECT r.id, r.title, r.description, r.type::text AS type, r.semester, r.year, r.tags,
             r."fileSize", r."mimeType", r."downloadCount", r."bookmarkCount", r."isSample", r."createdAt",
             d.id AS "departmentId", d.code AS "departmentCode", d.name AS "departmentName",
             c.id AS "courseId", c.code AS "courseCode", c.title AS "courseTitle", r."courseName",
             ${score} AS score
      FROM "Resource" r
      JOIN "Department" d ON d.id = r."departmentId"
      LEFT JOIN "Course" c ON c.id = r."courseId"
      WHERE ${Prisma.join(conditions, " AND ")}
    )
    SELECT * FROM ranked
    WHERE ${cursorCondition(sort, params.cursor)}
    ORDER BY ${column} DESC, id DESC
    LIMIT ${params.limit + 1}`;
}

/** Raw row shape returned by the query. */
export interface ResourceSearchRow {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  semester: number | null;
  year: number | null;
  tags: string[];
  fileSize: number;
  mimeType: string;
  downloadCount: number;
  bookmarkCount: number;
  isSample: boolean;
  createdAt: Date;
  departmentId: string;
  departmentCode: string;
  departmentName: string;
  courseId: string | null;
  courseCode: string | null;
  courseTitle: string | null;
  courseName: string | null;
  score: number;
}

/** Cursor for the row after which the next page starts. */
export function cursorFor(sort: ResourceSort, row: ResourceSearchRow): ResourceSearchCursor {
  if (sort === "newest") return { v: row.createdAt.toISOString(), id: row.id };
  if (sort === "popular") return { v: row.downloadCount, id: row.id };
  return { v: row.score, id: row.id };
}
