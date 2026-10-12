import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { hourBucket } from "@/lib/time";
import { getNotices } from "@/server/queries/campus.queries";
import { type EventCard, getPublicEvents } from "@/server/queries/event.queries";
import { getPublicStats } from "@/server/queries/platform.queries";
import type { NoticeView } from "@/server/queries/campus.queries";

export interface HomeFeed {
  stats: { upcomingAtFill: number; resources: number; clubs: number; helpdeskAnswers: number; busRoutes: number };
  /** End time of every published event that had not finished when the entry was filled. The browser counts the ones still ahead. */
  eventEnds: string[];
  /** Upcoming events (soonest first). The browser trims the list to this campus week. */
  events: EventCard[];
  notices: NoticeView[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_EVENT_ENDS = 200;

/**
 * Everything the landing page shows, in ONE tag-cached entry with no time argument.
 * Nothing here is keyed by the hour, so the page is prerendered and served from the CDN with its data
 * inline: no request-time render and no hourly cache miss (a cold Neon wake-up) for the first visitor.
 * "Now" is read inside the cache; whatever depends on the real current time (this week's events, the count of
 * events still ahead, "2 hours ago", the next bus) is finished in the browser. Any mutation expires the tags below.
 */
export async function getHomeFeed(): Promise<HomeFeed> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.events, CacheTags.resources, CacheTags.clubs, CacheTags.kb, CacheTags.buses, CacheTags.notices);

  const filledAt = new Date();
  // Look back a day so an event that is still running, or that the browser's clock sees as running, is kept.
  const since = new Date(filledAt.getTime() - DAY_MS);
  const bucket = hourBucket(since);
  const [stats, events, notices, ends] = await Promise.all([
    getPublicStats(bucket),
    getPublicEvents({ when: "upcoming", limit: 12 }, bucket),
    getNotices({ limit: 8 }, hourBucket(filledAt)),
    prisma.event.findMany({
      where: { deletedAt: null, status: "PUBLISHED", endAt: { gte: since }, club: { isActive: true, deletedAt: null } },
      select: { endAt: true },
      orderBy: { endAt: "asc" },
      take: MAX_EVENT_ENDS,
    }),
  ]);
  return {
    stats: { upcomingAtFill: stats.upcomingEvents, resources: stats.resources, clubs: stats.clubs, helpdeskAnswers: stats.helpdeskAnswers, busRoutes: stats.busRoutes },
    eventEnds: ends.map((row) => row.endAt.toISOString()),
    events: events.items,
    notices: notices.items,
  };
}
