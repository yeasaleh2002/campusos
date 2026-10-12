import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { normalizeMessage } from "@/server/chatbot/normalize";
import { buildKnowledgeQuery, type KnowledgeRow } from "@/server/chatbot/retrieval";
import { buildResourceSearchQuery, type ResourceSearchRow } from "@/server/search/resource-search";

// ───────────── Global search ─────────────

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string | null;
  link: string;
}

export interface GlobalSearchResult {
  events: SearchHit[];
  resources: SearchHit[];
  notices: SearchHit[];
  helpdesk: SearchHit[];
  lostFound: SearchHit[];
}

/**
 * Grouped search across modules (each group limited). Cached per normalised query
 * and invalidated by any of the module tags.
 */
export async function globalSearch(q: string, limit: number, nowBucket: string): Promise<GlobalSearchResult> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.events, CacheTags.resources, CacheTags.notices, CacheTags.kb, CacheTags.lostFound);

  const now = new Date(nowBucket);
  const contains = { contains: q, mode: "insensitive" as const };
  const message = normalizeMessage(q);

  const [events, resources, notices, helpdesk, lostFound] = await Promise.all([
    prisma.event.findMany({
      where: { deletedAt: null, status: "PUBLISHED", endAt: { gte: now }, club: { isActive: true, deletedAt: null }, OR: [{ title: contains }, { venue: contains }] },
      select: { id: true, slug: true, title: true, startAt: true, venue: true },
      orderBy: { startAt: "asc" },
      take: limit,
    }),
    prisma.$queryRaw<ResourceSearchRow[]>(buildResourceSearchQuery({ q, sort: "relevance", limit: limit - 1 })),
    prisma.notice.findMany({
      where: { deletedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }], AND: [{ OR: [{ title: contains }, { body: contains }] }] },
      select: { id: true, title: true, category: true, createdAt: true },
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: limit,
    }),
    prisma.$queryRaw<KnowledgeRow[]>(buildKnowledgeQuery({ text: message.text, terms: message.searchTerms, limit })),
    prisma.lostFoundItem.findMany({
      where: { deletedAt: null, status: { in: ["OPEN", "CLAIMED"] }, OR: [{ title: contains }, { description: contains }, { locationText: contains }] },
      select: { id: true, title: true, type: true, locationText: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
  ]);

  return {
    events: events.map((e) => ({ id: e.id, title: e.title, subtitle: `${e.startAt.toISOString()} · ${e.venue}`, link: `/events/${e.slug}` })),
    resources: resources.slice(0, limit).map((r) => ({ id: r.id, title: r.title, subtitle: [r.courseCode, r.departmentCode].filter(Boolean).join(" · "), link: `/resources/${r.id}` })),
    notices: notices.map((n) => ({ id: n.id, title: n.title, subtitle: n.category, link: `/notices/${n.id}` })),
    helpdesk: helpdesk.map((k) => ({ id: k.id, title: k.question, subtitle: k.category, link: `/helpdesk/${k.id}` })),
    lostFound: lostFound.map((l) => ({ id: l.id, title: l.title, subtitle: `${l.type} · ${l.locationText}`, link: `/lost-found/${l.id}` })),
  };
}

// ───────────── Admin analytics ─────────────

interface DailyCount {
  day: string;
  count: number;
}

/**
 * Dashboard numbers. Cached with tag `stats` (expired by every collection
 * mutation) and keyed by the hour so time-bucketed charts roll forward.
 */
export async function getAdminStats(nowBucket: string) {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.stats);

  const now = new Date(nowBucket);
  const since30d = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const since12w = new Date(now.getTime() - 12 * 7 * 24 * 3600 * 1000);

  const [users, events, registrations, checkIns, resources, pendingResources, lostFound, openLostFound, complaints, openComplaints, unanswered, unhelpful] =
    await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.event.count({ where: { deletedAt: null } }),
      prisma.eventRegistration.count({ where: { status: { in: ["REGISTERED", "CHECKED_IN"] } } }),
      prisma.eventRegistration.count({ where: { status: "CHECKED_IN" } }),
      prisma.resource.count({ where: { deletedAt: null, status: "APPROVED" } }),
      prisma.resource.count({ where: { deletedAt: null, status: "PENDING" } }),
      prisma.lostFoundItem.count({ where: { deletedAt: null } }),
      prisma.lostFoundItem.count({ where: { deletedAt: null, status: "OPEN" } }),
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: { in: ["RECEIVED", "IN_REVIEW"] } } }),
      prisma.chatMessage.count({ where: { role: "USER", isAnswered: false } }),
      prisma.chatMessage.count({ where: { role: "ASSISTANT", feedback: "NOT_HELPFUL" } }),
    ]);

  const [complaintStatus, signupsPerDay, registrationsPerWeek, resolution, topEvents, topSearchTerms] = await Promise.all([
    prisma.complaint.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.$queryRaw<DailyCount[]>`
      SELECT to_char(date_trunc('day', "createdAt" + interval '6 hours'), 'YYYY-MM-DD') AS day, count(*)::int AS count
      FROM "User" WHERE "createdAt" >= ${since30d} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<DailyCount[]>`
      SELECT to_char(date_trunc('week', "createdAt" + interval '6 hours'), 'YYYY-MM-DD') AS day, count(*)::int AS count
      FROM "EventRegistration" WHERE "createdAt" >= ${since12w} GROUP BY 1 ORDER BY 1`,
    prisma.$queryRaw<Array<{ resolved: number; avgHours: number | null; medianHours: number | null }>>`
      SELECT count(*)::int AS resolved,
             round(avg(extract(epoch FROM ("resolvedAt" - "createdAt")) / 3600)::numeric, 1)::float8 AS "avgHours",
             round((percentile_cont(0.5) WITHIN GROUP (ORDER BY extract(epoch FROM ("resolvedAt" - "createdAt")) / 3600))::numeric, 1)::float8 AS "medianHours"
      FROM "Complaint" WHERE "resolvedAt" IS NOT NULL`,
    prisma.event.findMany({
      where: { deletedAt: null, status: { in: ["PUBLISHED", "COMPLETED"] } },
      select: { id: true, title: true, registrationCount: true, capacity: true, startAt: true },
      orderBy: [{ registrationCount: "desc" }, { startAt: "desc" }],
      take: 5,
    }),
    prisma.searchTerm.findMany({ select: { term: true, count: true }, orderBy: { count: "desc" }, take: 10 }),
  ]);

  return {
    generatedAt: now,
    totals: {
      users,
      events,
      registrations,
      checkIns,
      resources,
      pendingResources,
      lostFound,
      openLostFound,
      complaints,
      openComplaints,
      chatbotUnanswered: unanswered,
      chatbotUnhelpful: unhelpful,
    },
    charts: {
      complaintsByStatus: complaintStatus.map((row) => ({ status: row.status, count: row._count._all })),
      signupsPerDay,
      registrationsPerWeek,
      complaintResolution: resolution[0] ?? { resolved: 0, avgHours: null, medianHours: null },
      topEvents,
      topSearchTerms,
    },
  };
}

// ───────────── Sitemap ─────────────

export interface SitemapEntry {
  path: string;
  lastModified: Date;
}

const SITEMAP_LIMIT = 5000;

/** Dynamic public URLs for app/sitemap.ts (published content only). */
export async function getSitemapEntries(): Promise<SitemapEntry[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.events, CacheTags.resources, CacheTags.notices, CacheTags.kb, CacheTags.clubs);

  const [events, resources, notices, entries, clubs] = await Promise.all([
    prisma.event.findMany({ where: { deletedAt: null, status: { in: ["PUBLISHED", "COMPLETED"] } }, select: { slug: true, updatedAt: true }, take: SITEMAP_LIMIT }),
    prisma.resource.findMany({ where: { deletedAt: null, status: "APPROVED" }, select: { id: true, updatedAt: true }, take: SITEMAP_LIMIT }),
    prisma.notice.findMany({ where: { deletedAt: null }, select: { id: true, updatedAt: true }, orderBy: { createdAt: "desc" }, take: SITEMAP_LIMIT }),
    prisma.knowledgeEntry.findMany({ where: { deletedAt: null, isPublished: true }, select: { id: true, updatedAt: true }, take: SITEMAP_LIMIT }),
    prisma.club.findMany({ where: { deletedAt: null, isActive: true }, select: { slug: true, updatedAt: true } }),
  ]);
  return [
    ...events.map((e) => ({ path: `/events/${e.slug}`, lastModified: e.updatedAt })),
    ...resources.map((r) => ({ path: `/resources/${r.id}`, lastModified: r.updatedAt })),
    ...notices.map((n) => ({ path: `/notices/${n.id}`, lastModified: n.updatedAt })),
    ...entries.map((k) => ({ path: `/helpdesk/${k.id}`, lastModified: k.updatedAt })),
    ...clubs.map((c) => ({ path: `/clubs/${c.slug}`, lastModified: c.updatedAt })),
  ];
}

// ───────────── Public landing stats ─────────────

export interface PublicStats {
  upcomingEvents: number;
  resources: number;
  clubs: number;
  helpdeskAnswers: number;
  busRoutes: number;
}

/**
 * Headline counts for the landing page. Tagged with every source collection so
 * any mutation refreshes them; keyed by the hour so "upcoming" rolls forward.
 */
export async function getPublicStats(nowBucket: string): Promise<PublicStats> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.events, CacheTags.resources, CacheTags.clubs, CacheTags.kb, CacheTags.buses);

  const now = new Date(nowBucket);
  const [upcomingEvents, resources, clubs, helpdeskAnswers, busRoutes] = await Promise.all([
    prisma.event.count({ where: { deletedAt: null, status: "PUBLISHED", endAt: { gte: now }, club: { isActive: true, deletedAt: null } } }),
    prisma.resource.count({ where: { deletedAt: null, status: "APPROVED" } }),
    prisma.club.count({ where: { deletedAt: null, isActive: true } }),
    prisma.knowledgeEntry.count({ where: { deletedAt: null, isPublished: true } }),
    prisma.busRoute.count({ where: { deletedAt: null, isActive: true } }),
  ]);
  return { upcomingEvents, resources, clubs, helpdeskAnswers, busRoutes };
}
