import { describeOffDays, describeWorkingDays } from "@/config/campus-calendar";
import type { KnowledgeSourceType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { type BusStop, describeDays } from "@/server/domain/bus-schedule";

/**
 * Keeps generated knowledge-base entries in step with structured data, so the
 * chatbot's free-text answers about buses and exams never go stale. Generated
 * entries are keyed by (sourceType, sourceRefId); a regeneration replaces them.
 * DB-only (usable from scripts): callers revalidate the `kb` tag.
 */

interface GeneratedEntry {
  question: string;
  answer: string;
  keywords: string[];
  category: "BUS" | "EXAM";
}

async function upsertGenerated(sourceType: KnowledgeSourceType, sourceRefId: string, entry: GeneratedEntry | null): Promise<void> {
  const existing = await prisma.knowledgeEntry.findFirst({ where: { sourceType, sourceRefId }, select: { id: true } });
  if (!entry) {
    if (existing) await prisma.knowledgeEntry.delete({ where: { id: existing.id } });
  } else if (existing) {
    await prisma.knowledgeEntry.update({ where: { id: existing.id }, data: { ...entry, isPublished: true, deletedAt: null } });
  } else {
    await prisma.knowledgeEntry.create({ data: { ...entry, sourceType, sourceRefId, isPublished: true } });
  }
}

const stopKeywords = (stops: BusStop[]) =>
  stops.flatMap((stop) => stop.name.toLowerCase().split(/[^a-z0-9]+/)).filter((word) => word.length >= 3);

/** Regenerates the "when does route X run" entry from the route and its active trips. */
export async function syncBusRouteKnowledge(routeId: string): Promise<void> {
  const route = await prisma.busRoute.findUnique({
    where: { id: routeId },
    select: {
      code: true,
      name: true,
      stops: true,
      notes: true,
      isActive: true,
      deletedAt: true,
      trips: { where: { isActive: true }, select: { departureTime: true, direction: true, daysOfWeek: true }, orderBy: { departureTime: "asc" } },
    },
  });
  if (!route || !route.isActive || route.deletedAt || route.trips.length === 0) {
    await upsertGenerated("BUS_ROUTE", routeId, null);
    return;
  }

  const stops = route.stops as unknown as BusStop[];
  const times = (direction: "TO_CAMPUS" | "FROM_CAMPUS") => {
    const trips = route.trips.filter((trip) => trip.direction === direction);
    if (trips.length === 0) return null;
    const days = describeDays([...new Set(trips.flatMap((trip) => trip.daysOfWeek))]);
    return `${trips.map((trip) => trip.departureTime).join(", ")} (${days})`;
  };
  const toCampus = times("TO_CAMPUS");
  const fromCampus = times("FROM_CAMPUS");
  const journey = stops[stops.length - 1].offsetMinutes;

  const answer = [
    `Route ${route.code} (${route.name}) stops at: ${stops.map((stop) => stop.name).join(" → ")}.`,
    toCampus ? `To campus, it leaves ${stops[0].name} at ${toCampus}.` : null,
    fromCampus ? `From campus, it leaves at ${fromCampus}.` : null,
    `The full journey takes about ${journey} minutes.`,
    `Buses run ${describeWorkingDays()} only: there is no bus service on ${describeOffDays()} (weekly off days) or on special closure days.`,
    route.notes,
    "Ask \"next bus to <place>\" for the live next departure.",
  ]
    .filter(Boolean)
    .join(" ");

  await upsertGenerated("BUS_ROUTE", routeId, {
    category: "BUS",
    question: `When does the ${route.name} bus (route ${route.code}) run?`,
    answer,
    keywords: [...new Set(["bus", "transport", "schedule", "time", route.code.toLowerCase(), ...stopKeywords(stops)])].slice(0, 20),
  });
}

/** Mirrors an EXAM notice into the knowledge base (and removes it when no longer live). */
export async function syncNoticeKnowledge(noticeId: string): Promise<void> {
  const notice = await prisma.notice.findUnique({
    where: { id: noticeId },
    select: {
      title: true,
      body: true,
      category: true,
      deletedAt: true,
      expiresAt: true,
      createdAt: true,
      department: { select: { code: true } },
      course: { select: { code: true } },
    },
  });
  const live = notice && notice.category === "EXAM" && !notice.deletedAt && (!notice.expiresAt || notice.expiresAt > new Date());
  if (!live) {
    await upsertGenerated("NOTICE", noticeId, null);
    return;
  }

  const published = notice.createdAt.toISOString().slice(0, 10);
  await upsertGenerated("NOTICE", noticeId, {
    category: "EXAM",
    question: notice.title,
    answer: `${notice.body.slice(0, 1500)} (Exam notice published ${published}.)`,
    keywords: [
      "exam",
      "notice",
      ...(notice.department ? [notice.department.code.toLowerCase()] : []),
      ...(notice.course ? [notice.course.code.toLowerCase()] : []),
    ],
  });
}
