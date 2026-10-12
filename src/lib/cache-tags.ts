import { revalidateTag } from "next/cache";

/**
 * Single source of truth for cache tags (documented in README "Caching tag map").
 *
 * Reads: cached fetchers use `"use cache"` + `cacheLife("max")` + `cacheTag(...)`.
 * Writes: every mutation calls the matching `revalidate*` helper below.
 * There is deliberately NO time-based revalidation - data changes only on mutation.
 */
export const CacheTags = {
  // Events & clubs
  events: "events",
  event: (id: string) => `event:${id}`,
  calendar: "calendar",
  clubs: "clubs",
  club: (id: string) => `club:${id}`,
  forms: "forms",

  // Academic resources
  resources: "resources",
  resource: (id: string) => `resource:${id}`,
  departments: "departments",
  department: (id: string) => `department:${id}`,
  courses: "courses",
  course: (id: string) => `course:${id}`,

  // Notices
  notices: "notices",
  notice: (id: string) => `notice:${id}`,

  // Transport
  buses: "buses",
  busRoute: (id: string) => `bus:${id}`,

  // Knowledge base / chatbot
  kb: "kb",
  kbEntry: (id: string) => `kb:${id}`,

  // Lost & found
  lostFound: "lost-found",
  lostFoundItem: (id: string) => `lf:${id}`,

  // Aggregates shown on landing page / dashboards
  stats: "stats",

  // Site banner / maintenance switch
  settings: "settings",
} as const;

/**
 * Immediate expiry: the next request after a mutation re-renders from the DB, so
 * nobody ever sees a cancelled event or a deleted resource. (`"max"` would serve
 * one stale response first.) Mutations are rare and hot counters only touch
 * per-item detail tags, so the extra render is cheap.
 */
const EXPIRE_NOW = { expire: 0 };

type MaybeTag = string | null | undefined | false;

/** Expires every given tag (falsy entries are skipped, duplicates collapsed). */
export function revalidateTags(...tags: MaybeTag[]): void {
  for (const tag of new Set(tags)) {
    if (tag) revalidateTag(tag, EXPIRE_NOW);
  }
}

// ───────────── Events & clubs ─────────────

/** Event created/updated/published/cancelled/deleted: lists, calendar, detail, stats. */
export const revalidateEvents = (id?: string) =>
  revalidateTags(CacheTags.events, CacheTags.calendar, CacheTags.stats, id && CacheTags.event(id));

/**
 * Hot counters (registrations, check-ins) only touch the event's detail page, so
 * a busy registration window does not invalidate every list on every click.
 */
export const revalidateEventDetail = (id: string) => revalidateTags(CacheTags.event(id));

/** Club changes also affect event cards (club name/logo) and form listings. */
export const revalidateClubs = (id?: string) =>
  revalidateTags(
    CacheTags.clubs,
    CacheTags.events,
    CacheTags.calendar,
    CacheTags.forms,
    CacheTags.stats,
    id && CacheTags.club(id),
  );

export const revalidateForms = () => revalidateTags(CacheTags.forms);

// ───────────── Resources & academics ─────────────

export interface ResourceRefs {
  courseId?: string | null;
  departmentId?: string | null;
}

/** Resource approved/updated/deleted: lists, detail and the course/department views. */
export const revalidateResources = (id?: string, refs: ResourceRefs = {}) =>
  revalidateTags(
    CacheTags.resources,
    CacheTags.stats,
    id && CacheTags.resource(id),
    refs.courseId && CacheTags.course(refs.courseId),
    refs.departmentId && CacheTags.department(refs.departmentId),
  );

/** Download/bookmark counters only touch the resource's detail page. */
export const revalidateResourceDetail = (id: string) => revalidateTags(CacheTags.resource(id));

/** Department/course create/rename/delete: dropdowns plus resources and notices that show them. */
export const revalidateAcademics = (refs: ResourceRefs = {}) =>
  revalidateTags(
    CacheTags.departments,
    CacheTags.courses,
    CacheTags.resources,
    CacheTags.notices,
    refs.courseId && CacheTags.course(refs.courseId),
    refs.departmentId && CacheTags.department(refs.departmentId),
  );

// ───────────── Other modules ─────────────

export const revalidateNotices = (id?: string) =>
  revalidateTags(CacheTags.notices, CacheTags.stats, id && CacheTags.notice(id));

/** Bus data also feeds chatbot answers (KB entries sourced from routes). */
export const revalidateBuses = (id?: string) =>
  revalidateTags(CacheTags.buses, CacheTags.kb, CacheTags.stats, id && CacheTags.busRoute(id));

/**
 * Campus closure created/updated/deleted: the closure list (`calendar`), bus answers and pages (`buses`)
 * and the generated knowledge-base entries (`kb`).
 */
export const revalidateCampusClosures = () => revalidateTags(CacheTags.calendar, CacheTags.buses, CacheTags.kb);

export const revalidateKnowledgeBase = (id?: string) =>
  revalidateTags(CacheTags.kb, CacheTags.stats, id && CacheTags.kbEntry(id));

export const revalidateLostFound = (id?: string) =>
  revalidateTags(CacheTags.lostFound, CacheTags.stats, id && CacheTags.lostFoundItem(id));

export const revalidateStats = () => revalidateTags(CacheTags.stats);

/** Banner / maintenance changes affect every public layout. */
export const revalidateSettings = () => revalidateTags(CacheTags.settings);
