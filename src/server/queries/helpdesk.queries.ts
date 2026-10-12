import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { KnowledgeCategory } from "@/generated/prisma/enums";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import { normalizeMessage } from "@/server/chatbot/normalize";
import { buildKnowledgeQuery, type KnowledgeRow } from "@/server/chatbot/retrieval";

const entrySelect = {
  id: true,
  category: true,
  question: true,
  answer: true,
  keywords: true,
  isSample: true,
  sourceType: true,
  updatedAt: true,
} satisfies Prisma.KnowledgeEntrySelect;

export type HelpdeskEntry = Prisma.KnowledgeEntryGetPayload<{ select: typeof entrySelect }>;

const publishedWhere = { isPublished: true, deletedAt: null } satisfies Prisma.KnowledgeEntryWhereInput;

const SEARCH_LIMIT = 20;

/**
 * FAQ listing. Without `q`: alphabetical by category/question, cursor-paginated.
 * With `q`: the chatbot's ranked retrieval (top 20, no cursor - results are a ranking).
 */
export async function getHelpdeskEntries(filters: {
  category?: KnowledgeCategory;
  q?: string;
  cursor?: string;
  limit: number;
}): Promise<Page<HelpdeskEntry>> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.kb);

  if (filters.q) {
    const message = normalizeMessage(filters.q);
    const rows = await prisma.$queryRaw<KnowledgeRow[]>(
      buildKnowledgeQuery({ text: message.text, terms: message.searchTerms, category: filters.category, limit: SEARCH_LIMIT }),
    );
    return {
      items: rows.map((row) => ({
        id: row.id,
        category: row.category,
        question: row.question,
        answer: row.answer,
        keywords: row.keywords,
        isSample: row.isSample,
        sourceType: row.sourceType as HelpdeskEntry["sourceType"],
        updatedAt: row.updatedAt,
      })),
      nextCursor: null,
    };
  }

  const rows = await prisma.knowledgeEntry.findMany({
    where: { ...publishedWhere, category: filters.category },
    select: entrySelect,
    orderBy: [{ category: "asc" }, { question: "asc" }, { id: "asc" }],
    take: filters.limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, filters.limit, (row) => row.id);
}

/** Categories with published-entry counts. */
export async function getHelpdeskCategories() {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.kb);

  const groups = await prisma.knowledgeEntry.groupBy({ by: ["category"], where: publishedWhere, _count: { _all: true }, orderBy: { category: "asc" } });
  return groups.map((group) => ({ category: group.category, count: group._count._all }));
}

export async function getHelpdeskEntry(id: string): Promise<HelpdeskEntry | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.kb, CacheTags.kbEntry(id));

  return prisma.knowledgeEntry.findFirst({ where: { ...publishedWhere, id }, select: entrySelect });
}

/**
 * Chatbot retrieval, cached per normalised question so repeated questions
 * ("bus fare?") skip the database until the knowledge base changes.
 */
export async function retrieveKnowledge(text: string, terms: string[]): Promise<KnowledgeRow[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.kb);

  return prisma.$queryRaw<KnowledgeRow[]>(buildKnowledgeQuery({ text, terms, limit: 8 }));
}
