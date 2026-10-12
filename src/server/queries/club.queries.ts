import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { ClubCategory } from "@/generated/prisma/enums";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import { type EventCard, eventCardSelect } from "@/server/queries/event.queries";
import { spotsLeft } from "@/server/domain/event-registration";

const clubCardSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  coverUrl: true,
  category: true,
  memberCount: true,
} satisfies Prisma.ClubSelect;

export type ClubCard = Prisma.ClubGetPayload<{ select: typeof clubCardSelect }>;

const activeClubWhere = { isActive: true, deletedAt: null } satisfies Prisma.ClubWhereInput;

export interface PublicClubFilters {
  category?: ClubCategory;
  q?: string;
  cursor?: string;
  limit: number;
}

/** Club directory, alphabetical, cursor-paginated. */
export async function getPublicClubs(filters: PublicClubFilters): Promise<Page<ClubCard>> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.clubs);

  const rows = await prisma.club.findMany({
    where: {
      ...activeClubWhere,
      category: filters.category,
      ...(filters.q ? { name: { contains: filters.q, mode: "insensitive" } } : {}),
    },
    select: clubCardSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: filters.limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, filters.limit, (club) => club.id);
}

export type ClubDetail = ClubCard & { upcomingEvents: EventCard[] };

const UPCOMING_ON_CLUB_PAGE = 6;

/** Club page: profile + next published events. */
export async function getPublicClubBySlug(slug: string, nowBucket: string): Promise<ClubDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.clubs, CacheTags.events);

  const club = await prisma.club.findFirst({ where: { ...activeClubWhere, slug }, select: clubCardSelect });
  if (!club) return null;
  cacheTag(CacheTags.club(club.id));

  const events = await prisma.event.findMany({
    where: { clubId: club.id, status: "PUBLISHED", deletedAt: null, endAt: { gte: new Date(nowBucket) } },
    select: eventCardSelect,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: UPCOMING_ON_CLUB_PAGE,
  });
  return {
    ...club,
    upcomingEvents: events.map((event) => ({ ...event, spotsLeft: spotsLeft(event.capacity, event.registrationCount) })),
  };
}
