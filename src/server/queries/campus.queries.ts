import { cacheLife, cacheTag } from "next/cache";
import type { Prisma } from "@/generated/prisma/client";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import type { BusStop } from "@/server/domain/bus-schedule";
import type { NoticeListQuery } from "@/server/validators/campus.validators";

// ───────────── Bus ─────────────

const tripSelect = { id: true, departureTime: true, direction: true, daysOfWeek: true, isActive: true } satisfies Prisma.BusTripSelect;

const routeSelect = {
  id: true,
  code: true,
  name: true,
  stops: true,
  notes: true,
  updatedAt: true,
  trips: { where: { isActive: true }, select: tripSelect, orderBy: { departureTime: "asc" } },
} satisfies Prisma.BusRouteSelect;

type RouteRow = Prisma.BusRouteGetPayload<{ select: typeof routeSelect }>;
export type BusRouteView = Omit<RouteRow, "stops"> & { stops: BusStop[] };

const toView = (route: RouteRow): BusRouteView => ({ ...route, stops: route.stops as unknown as BusStop[] });

/** All active routes with their active trips. */
export async function getBusRoutes(): Promise<BusRouteView[]> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.buses);

  const routes = await prisma.busRoute.findMany({ where: { isActive: true, deletedAt: null }, select: routeSelect, orderBy: { code: "asc" } });
  return routes.map(toView);
}

export async function getBusRoute(code: string): Promise<BusRouteView | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.buses);

  const route = await prisma.busRoute.findFirst({ where: { code, isActive: true, deletedAt: null }, select: routeSelect });
  if (!route) return null;
  cacheTag(CacheTags.busRoute(route.id));
  return toView(route);
}

// ───────────── Notices ─────────────

const noticeSelect = {
  id: true,
  title: true,
  body: true,
  category: true,
  pinned: true,
  expiresAt: true,
  attachmentUrl: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, code: true, name: true } },
  course: { select: { id: true, code: true, title: true } },
} satisfies Prisma.NoticeSelect;

export type NoticeView = Prisma.NoticeGetPayload<{ select: typeof noticeSelect }>;

/** Live (non-expired) notices, pinned first then newest. */
export async function getNotices(filters: NoticeListQuery, nowBucket: string): Promise<Page<NoticeView>> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.notices);

  const rows = await prisma.notice.findMany({
    where: {
      deletedAt: null,
      category: filters.category,
      departmentId: filters.departmentId,
      courseId: filters.courseId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date(nowBucket) } }],
      ...(filters.q
        ? { AND: [{ OR: [{ title: { contains: filters.q, mode: "insensitive" } }, { body: { contains: filters.q, mode: "insensitive" } }] }] }
        : {}),
    },
    select: noticeSelect,
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }, { id: "desc" }],
    take: filters.limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, filters.limit, (row) => row.id);
}

export async function getNotice(id: string): Promise<NoticeView | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.notices, CacheTags.notice(id));

  return prisma.notice.findFirst({ where: { id, deletedAt: null }, select: noticeSelect });
}

// ───────────── Forms ─────────────

const formSelect = {
  id: true,
  title: true,
  description: true,
  url: true,
  deadline: true,
  createdAt: true,
  club: { select: { id: true, name: true, slug: true } },
} satisfies Prisma.FormLinkSelect;

export type FormView = Prisma.FormLinkGetPayload<{ select: typeof formSelect }>;

/** Open forms whose deadline hasn't passed, soonest deadline first (no-deadline forms last). */
export async function getOpenForms(filters: { clubId?: string; cursor?: string; limit: number }, nowBucket: string): Promise<Page<FormView>> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.forms);

  const rows = await prisma.formLink.findMany({
    where: {
      deletedAt: null,
      isOpen: true,
      clubId: filters.clubId,
      OR: [{ deadline: null }, { deadline: { gt: new Date(nowBucket) } }],
    },
    select: formSelect,
    orderBy: [{ deadline: { sort: "asc", nulls: "last" } }, { id: "asc" }],
    take: filters.limit + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, filters.limit, (row) => row.id);
}
