import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { LostFoundCategory, LostFoundType } from "@/generated/prisma/enums";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import { matchScore } from "@/server/domain/lost-found";

/** Public card - no reporter identity or contact details. */
export const lostFoundCardSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  category: true,
  locationText: true,
  occurredAt: true,
  imageUrls: true,
  status: true,
  createdAt: true,
} satisfies Prisma.LostFoundItemSelect;

export type LostFoundCard = Prisma.LostFoundItemGetPayload<{ select: typeof lostFoundCardSelect }>;

/** Public detail adds the reporter's display name and claim count - still no contact info. */
const lostFoundDetailSelect = {
  ...lostFoundCardSelect,
  updatedAt: true,
  reporter: { select: { name: true } },
  _count: { select: { claims: true } },
} satisfies Prisma.LostFoundItemSelect;

export type LostFoundDetail = Prisma.LostFoundItemGetPayload<{ select: typeof lostFoundDetailSelect }>;

export interface LostFoundFilters {
  type?: LostFoundType;
  category?: LostFoundCategory;
  status: "OPEN" | "CLAIMED" | "RESOLVED";
  q?: string;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string;
  limit: number;
}

export async function getLostFoundItems(filters: LostFoundFilters): Promise<Page<LostFoundCard>> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.lostFound);

  const rows = await prisma.lostFoundItem.findMany({
    where: {
      deletedAt: null,
      status: filters.status,
      type: filters.type,
      category: filters.category,
      occurredAt: {
        ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
        ...(filters.dateTo ? { lt: new Date(filters.dateTo) } : {}),
      },
      ...(filters.q
        ? { OR: [{ title: { contains: filters.q, mode: "insensitive" } }, { description: { contains: filters.q, mode: "insensitive" } }, { locationText: { contains: filters.q, mode: "insensitive" } }] }
        : {}),
    },
    select: lostFoundCardSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: filters.limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, filters.limit, (row) => row.id);
}

interface MatchCandidateRow {
  id: string;
  sameCategory: boolean;
  similarity: number;
  daysApart: number;
}

const MATCH_WINDOW_DAYS = 60;
const MATCH_LIMIT = 5;

/**
 * Likely counterparts for a post: opposite type, still OPEN, within 60 days,
 * scored by category + pg_trgm text similarity + date proximity (domain/lost-found).
 */
export async function getLostFoundMatches(id: string): Promise<Array<LostFoundCard & { score: number }>> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.lostFound, CacheTags.lostFoundItem(id));

  const candidates = await prisma.$queryRaw<MatchCandidateRow[]>`
    SELECT c.id,
           (c.category = s.category) AS "sameCategory",
           similarity(c.title || ' ' || c.description, s.title || ' ' || s.description)::float8 AS similarity,
           (abs(extract(epoch FROM (c."occurredAt" - s."occurredAt"))) / 86400)::float8 AS "daysApart"
    FROM "LostFoundItem" s
    JOIN "LostFoundItem" c ON c.type <> s.type AND c.id <> s.id
    WHERE s.id = ${id} AND s."deletedAt" IS NULL
      AND c."deletedAt" IS NULL AND c.status = 'OPEN'
      AND abs(extract(epoch FROM (c."occurredAt" - s."occurredAt"))) <= ${MATCH_WINDOW_DAYS * 86400}
    ORDER BY (c.category = s.category) DESC, similarity(c.title || ' ' || c.description, s.title || ' ' || s.description) DESC
    LIMIT 50`;

  const top = candidates
    .map((row) => ({ id: row.id, score: matchScore({ sameCategory: row.sameCategory, textSimilarity: row.similarity, daysApart: row.daysApart }) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MATCH_LIMIT);
  if (top.length === 0) return [];

  const cards = await prisma.lostFoundItem.findMany({ where: { id: { in: top.map((m) => m.id) } }, select: lostFoundCardSelect });
  return top.flatMap((match) => {
    const card = cards.find((c) => c.id === match.id);
    return card ? [{ ...card, score: match.score }] : [];
  });
}

/** Public item page (hidden/removed items are excluded). */
export async function getLostFoundItem(id: string): Promise<LostFoundDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.lostFound, CacheTags.lostFoundItem(id));

  return prisma.lostFoundItem.findFirst({
    where: { id, deletedAt: null, status: { not: "REJECTED" } },
    select: lostFoundDetailSelect,
  });
}
