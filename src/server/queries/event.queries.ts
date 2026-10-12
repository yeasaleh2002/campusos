import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import type { EventType } from "@/generated/prisma/enums";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { campusWeekRange } from "@/config/campus-calendar";
import { dhakaMonthRange } from "@/lib/time";
import { type Page, toPage } from "@/lib/validation";
import { spotsLeft } from "@/server/domain/event-registration";
import type { EVENT_WINDOWS } from "@/server/validators/event.validators";

/**
 * Tag-cached public event reads. Arguments must be serialisable (they form the
 * cache key); "now"-relative filters receive an hour bucket, see lib/time.ts.
 */

const clubSummarySelect = { id: true, name: true, slug: true, logoUrl: true } satisfies Prisma.ClubSelect;

export const eventCardSelect = {
  id: true,
  title: true,
  slug: true,
  type: true,
  status: true,
  startAt: true,
  endAt: true,
  venue: true,
  bannerUrl: true,
  capacity: true,
  registrationCount: true,
  registrationDeadline: true,
  club: { select: clubSummarySelect },
} satisfies Prisma.EventSelect;

type EventCardRow = Prisma.EventGetPayload<{ select: typeof eventCardSelect }>;
export type EventCard = EventCardRow & { spotsLeft: number | null };

const withSpots = <T extends { capacity: number | null; registrationCount: number }>(event: T) => ({
  ...event,
  spotsLeft: spotsLeft(event.capacity, event.registrationCount),
});

/** Published, not deleted, owned by an active club. */
const visibleEventWhere = {
  deletedAt: null,
  club: { isActive: true, deletedAt: null },
} satisfies Prisma.EventWhereInput;

export interface PublicEventFilters {
  clubId?: string;
  clubSlug?: string;
  type?: EventType;
  when: (typeof EVENT_WINDOWS)[number];
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  cursor?: string;
  limit: number;
}

function timeWindow(when: PublicEventFilters["when"], now: Date): Prisma.EventWhereInput {
  switch (when) {
    case "upcoming":
      return { endAt: { gte: now } };
    case "past":
      return { endAt: { lt: now } };
    case "thisWeek": {
      const { start, end } = campusWeekRange(now);
      return { startAt: { gte: start, lt: end } };
    }
    case "all":
      return {};
  }
}

function buildEventWhere(filters: PublicEventFilters, now: Date): Prisma.EventWhereInput {
  return {
    ...visibleEventWhere,
    status: filters.when === "past" ? { in: ["PUBLISHED", "COMPLETED"] } : "PUBLISHED",
    clubId: filters.clubId,
    club: { ...visibleEventWhere.club, slug: filters.clubSlug },
    type: filters.type,
    AND: [
      timeWindow(filters.when, now),
      filters.dateFrom ? { startAt: { gte: new Date(filters.dateFrom) } } : {},
      filters.dateTo ? { startAt: { lt: new Date(filters.dateTo) } } : {},
      filters.q
        ? { OR: [{ title: { contains: filters.q, mode: "insensitive" } }, { venue: { contains: filters.q, mode: "insensitive" } }] }
        : {},
    ],
  };
}

/** Event cards for the public feed, cursor-paginated by startAt. */
export async function getPublicEvents(filters: PublicEventFilters, nowBucket: string): Promise<Page<EventCard>> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.events);

  const direction = filters.when === "past" ? "desc" : "asc";
  const rows = await prisma.event.findMany({
    where: buildEventWhere(filters, new Date(nowBucket)),
    select: eventCardSelect,
    orderBy: [{ startAt: direction }, { id: direction }],
    take: filters.limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });
  const page = toPage(rows, filters.limit, (event) => event.id);
  return { ...page, items: page.items.map(withSpots) };
}

const eventDetailSelect = {
  ...eventCardSelect,
  description: true,
  createdAt: true,
  updatedAt: true,
  club: { select: { ...clubSummarySelect, category: true, description: true } },
} satisfies Prisma.EventSelect;

export type EventDetail = Prisma.EventGetPayload<{ select: typeof eventDetailSelect }> & { spotsLeft: number | null };

/** Public event page data (published, completed or cancelled - drafts are hidden). */
export async function getPublicEventBySlug(slug: string): Promise<EventDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.events);

  const event = await prisma.event.findFirst({
    where: { ...visibleEventWhere, slug, status: { in: ["PUBLISHED", "COMPLETED", "CANCELLED"] } },
    select: eventDetailSelect,
  });
  if (!event) return null;
  cacheTag(CacheTags.event(event.id));
  return withSpots(event);
}

const calendarSelect = {
  id: true,
  title: true,
  slug: true,
  type: true,
  status: true,
  startAt: true,
  endAt: true,
  venue: true,
  club: { select: { name: true, slug: true } },
} satisfies Prisma.EventSelect;

export type CalendarEvent = Prisma.EventGetPayload<{ select: typeof calendarSelect }>;

/** Lightweight month view (Dhaka calendar month). Cancelled events are included so the UI can strike them out. */
export async function getEventCalendar(month: string): Promise<CalendarEvent[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.events, CacheTags.calendar);

  const { start, end } = dhakaMonthRange(month);
  return prisma.event.findMany({
    where: { ...visibleEventWhere, status: { in: ["PUBLISHED", "COMPLETED", "CANCELLED"] }, startAt: { gte: start, lt: end } },
    select: calendarSelect,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    take: 500,
  });
}
