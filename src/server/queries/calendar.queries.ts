import { cacheLife, cacheTag } from "next/cache";
import { type CampusClosureLite, addDaysToDateKey, getDhakaDateKey } from "@/config/campus-calendar";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";

/** How far ahead closures are loaded: far enough for the "next service day" search. */
const LOOKAHEAD_DAYS = 400;
const MAX_CLOSURES = 500;

/** A closure row as the app uses it: `date` becomes the Dhaka `YYYY-MM-DD` key. */
export function toClosureLite(row: { date: Date; title: string; closesCampus: boolean; suspendsBus: boolean; note: string | null }): CampusClosureLite {
  return { dateKey: row.date.toISOString().slice(0, 10), title: row.title, closesCampus: row.closesCampus, suspendsBus: row.suspendsBus, note: row.note };
}

/** Closures from `fromKey` (yesterday or later), cached under the `calendar` tag; changes only on a closure mutation. */
async function loadClosures(fromKey: string): Promise<CampusClosureLite[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.calendar);

  const rows = await prisma.campusClosure.findMany({
    where: { date: { gte: new Date(`${fromKey}T00:00:00Z`), lte: new Date(`${addDaysToDateKey(fromKey, LOOKAHEAD_DAYS)}T00:00:00Z`) } },
    select: { date: true, title: true, closesCampus: true, suspendsBus: true, note: true },
    orderBy: { date: "asc" },
    take: MAX_CLOSURES,
  });
  return rows.map(toClosureLite);
}

/**
 * Upcoming special closures (from yesterday, so a day that just rolled over is still known).
 * The cache key is the Dhaka date, not a timer: nothing revalidates on time, only on a closure mutation.
 */
export function getCampusClosures(now: Date = new Date()): Promise<CampusClosureLite[]> {
  return loadClosures(addDaysToDateKey(getDhakaDateKey(now), -1));
}
