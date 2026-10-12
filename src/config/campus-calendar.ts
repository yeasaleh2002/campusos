/**
 * Campus calendar: the single source of truth for which days City University is open
 * and which days the shuttle buses run. Pure functions (no I/O), so the same code runs in
 * the proxy, route handlers, the chatbot, cron jobs and the browser.
 *
 * Business rule (project owner):
 * - OPEN: Friday, Saturday, Sunday, Monday, Tuesday.
 * - CLOSED (weekly off days): Wednesday and Thursday.
 * - NO bus service on off days (bus days = working days).
 * - Special closures (public holidays, exam-day changes) are stored in the `CampusClosure`
 *   table; callers pass them in (cached under the `calendar` tag) and they override the weekly rule.
 *
 * Every weekday is computed on the Asia/Dhaka wall clock with Intl, never with the server's UTC
 * day or the browser's local day: Vercel runs in UTC, so a naive `getDay()` gives the wrong day
 * between 18:00 and 24:00 Dhaka time. No other file should hardcode weekday numbers or names.
 */

/** 0 = Sunday ... 6 = Saturday (the same numbers as `BusTrip.daysOfWeek` and `Date#getUTCDay`). */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const CAMPUS_TIME_ZONE = "Asia/Dhaka";

/** Bangladesh has no daylight saving; used only to turn a Dhaka wall-clock time into an instant. */
export const DHAKA_UTC_OFFSET_MINUTES = 6 * 60;

export const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = MINUTES_PER_DAY * MS_PER_MINUTE;

export const WEEKDAY = { SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6 } as const satisfies Record<string, Weekday>;

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Open days: Friday to Tuesday. */
export const WORKING_DAYS: readonly Weekday[] = [WEEKDAY.FRIDAY, WEEKDAY.SATURDAY, WEEKDAY.SUNDAY, WEEKDAY.MONDAY, WEEKDAY.TUESDAY];

/** Weekly off days: Wednesday and Thursday. */
export const OFF_DAYS: readonly Weekday[] = [WEEKDAY.WEDNESDAY, WEEKDAY.THURSDAY];

/** Days the bus runs: the same as the working days unless a closure suspends a particular date. */
export const BUS_SERVICE_DAYS: readonly Weekday[] = WORKING_DAYS;

/** The campus week runs Friday to Thursday (used by calendar grids and the "This week" filter). */
export const CAMPUS_WEEK_START: Weekday = WEEKDAY.FRIDAY;

/** Weekdays in display order for a Friday-first week. */
export const CAMPUS_WEEK_ORDER: readonly Weekday[] = [...WORKING_DAYS, ...OFF_DAYS];

export const weekdayName = (weekday: number): string => WEEKDAY_NAMES[normaliseWeekday(weekday)];
export const weekdayShort = (weekday: number): string => WEEKDAY_SHORT[normaliseWeekday(weekday)];

export function normaliseWeekday(weekday: number): Weekday {
  return (((Math.trunc(weekday) % 7) + 7) % 7) as Weekday;
}

export const isWorkingWeekday = (weekday: number): boolean => WORKING_DAYS.includes(normaliseWeekday(weekday));
export const isOffWeekday = (weekday: number): boolean => OFF_DAYS.includes(normaliseWeekday(weekday));
export const isBusWeekday = (weekday: number): boolean => BUS_SERVICE_DAYS.includes(normaliseWeekday(weekday));

/** A special closure for one calendar date (Dhaka). `dateKey` is `YYYY-MM-DD`. */
export interface CampusClosureLite {
  dateKey: string;
  title: string;
  closesCampus: boolean;
  suspendsBus: boolean;
  note?: string | null;
}

export type ClosureList = readonly CampusClosureLite[];

// ───────────── Dhaka wall clock ─────────────

export interface DhakaParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: Weekday;
  /** Minutes since Dhaka midnight. */
  minutes: number;
  /** `YYYY-MM-DD` on the Dhaka calendar. */
  dateKey: string;
}

let formatter: Intl.DateTimeFormat | null = null;

function dhakaFormatter(): Intl.DateTimeFormat {
  formatter ??= new Intl.DateTimeFormat("en-US", {
    timeZone: CAMPUS_TIME_ZONE,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  return formatter;
}

/** The current instant. Weekdays are always derived with {@link getDhakaParts}, never from this value's local day. */
export function getDhakaNow(): Date {
  return new Date();
}

/** Year, month, day, time and weekday of an instant on the Asia/Dhaka wall clock. */
export function getDhakaParts(date: Date): DhakaParts {
  const values: Record<string, string> = {};
  for (const part of dhakaFormatter().formatToParts(date)) values[part.type] = part.value;
  const year = Number(values.year);
  const month = Number(values.month);
  const day = Number(values.day);
  const hour = Number(values.hour) % 24;
  const minute = Number(values.minute);
  return {
    year,
    month,
    day,
    hour,
    minute,
    weekday: WEEKDAY_SHORT.indexOf(values.weekday as (typeof WEEKDAY_SHORT)[number]) as Weekday,
    minutes: hour * 60 + minute,
    dateKey: `${values.year}-${values.month}-${values.day}`,
  };
}

/** Weekday (0 = Sunday) of an instant on the Dhaka calendar. */
export const getDhakaWeekday = (date: Date): Weekday => getDhakaParts(date).weekday;

/** `YYYY-MM-DD` of an instant on the Dhaka calendar. */
export const getDhakaDateKey = (date: Date): string => getDhakaParts(date).dateKey;

/** Weekday of a `YYYY-MM-DD` date (pure calendar maths; no time zone involved). */
export function weekdayOfDateKey(dateKey: string): Weekday {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDay() as Weekday;
}

/** `YYYY-MM-DD` plus `days` calendar days. */
export function addDaysToDateKey(dateKey: string, days: number): string {
  return new Date(new Date(`${dateKey}T12:00:00Z`).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** The instant of a Dhaka wall-clock time on `dateKey` (`minutes` since Dhaka midnight). */
export function dhakaInstant(dateKey: string, minutes = 0): Date {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) + (minutes - DHAKA_UTC_OFFSET_MINUTES) * MS_PER_MINUTE);
}

/** Calendar days from `fromKey` to `toKey` (positive when `toKey` is later). */
export function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / MS_PER_DAY);
}

// ───────────── Open / bus-service rules ─────────────

export function closureOn(dateKey: string, closures: ClosureList = []): CampusClosureLite | undefined {
  return closures.find((closure) => closure.dateKey === dateKey);
}

export type OffDayReason = "OFF_DAY" | "CLOSURE";

export interface DayStatus {
  dateKey: string;
  weekday: Weekday;
  open: boolean;
  busService: boolean;
  /** Why the campus is closed (weekly off day wins over a closure on the same date). */
  campusReason: OffDayReason | null;
  /** Why the bus is not running. */
  busReason: OffDayReason | null;
  closure: CampusClosureLite | null;
}

/** Full status of one Dhaka calendar date. */
export function statusOfDate(dateKey: string, closures: ClosureList = []): DayStatus {
  const weekday = weekdayOfDateKey(dateKey);
  const closure = closureOn(dateKey, closures) ?? null;
  const weeklyOpen = isWorkingWeekday(weekday);
  const weeklyBus = isBusWeekday(weekday);
  const campusReason: OffDayReason | null = !weeklyOpen ? "OFF_DAY" : closure?.closesCampus ? "CLOSURE" : null;
  const busReason: OffDayReason | null = !weeklyBus ? "OFF_DAY" : closure?.suspendsBus ? "CLOSURE" : null;
  return { dateKey, weekday, open: campusReason === null, busService: busReason === null, campusReason, busReason, closure };
}

/** Status of the Dhaka day an instant falls on. */
export const statusOf = (date: Date, closures: ClosureList = []): DayStatus => statusOfDate(getDhakaDateKey(date), closures);

/** True when City University is open on the Dhaka day of `date`. */
export const isCampusOpen = (date: Date, closures: ClosureList = []): boolean => statusOf(date, closures).open;

/** True when the shuttle runs on the Dhaka day of `date`. */
export const isBusServiceDay = (date: Date, closures: ClosureList = []): boolean => statusOf(date, closures).busService;

export interface UpcomingDay {
  dateKey: string;
  weekday: Weekday;
  /** Calendar days after the starting date (1 = tomorrow). */
  dayOffset: number;
}

const SEARCH_LIMIT_DAYS = 120;

function nextMatchingDay(date: Date, closures: ClosureList, matches: (status: DayStatus) => boolean, includeToday: boolean): UpcomingDay | null {
  const startKey = getDhakaDateKey(date);
  for (let offset = includeToday ? 0 : 1; offset <= SEARCH_LIMIT_DAYS; offset++) {
    const dateKey = addDaysToDateKey(startKey, offset);
    if (matches(statusOfDate(dateKey, closures))) return { dateKey, weekday: weekdayOfDateKey(dateKey), dayOffset: offset };
  }
  return null;
}

/** The next Dhaka day (after today unless `includeToday`) on which the bus runs. */
export const getNextServiceDay = (date: Date, closures: ClosureList = [], includeToday = false): UpcomingDay | null =>
  nextMatchingDay(date, closures, (status) => status.busService, includeToday);

/** The next Dhaka day (after today unless `includeToday`) on which the campus is open. */
export const getNextOpenDay = (date: Date, closures: ClosureList = [], includeToday = false): UpcomingDay | null =>
  nextMatchingDay(date, closures, (status) => status.open, includeToday);

/** Human wording for why a day is closed, e.g. "Wednesday is a weekly off day" or "Eid holiday". */
export function describeClosedReason(status: DayStatus, kind: "campus" | "bus" = "campus"): string {
  const reason = kind === "campus" ? status.campusReason : status.busReason;
  if (reason === "CLOSURE" && status.closure) return status.closure.title;
  return `${weekdayName(status.weekday)} is a weekly off day`;
}

/** "weekly off days: Wednesday and Thursday" style text used by the chatbot and the KB. */
export const describeWorkingDays = (): string => `${weekdayName(WORKING_DAYS[0])} to ${weekdayName(WORKING_DAYS[WORKING_DAYS.length - 1])}`;
export const describeOffDays = (): string => OFF_DAYS.map(weekdayName).join(" and ");

/** "Fri, Sat, Sun" style summary of a trip's operating days, in campus-week order. */
export function describeWeekdays(days: readonly number[]): string {
  const unique = [...new Set(days.map(normaliseWeekday))];
  if (unique.length === 7) return "every day";
  const order = unique.sort((a, b) => CAMPUS_WEEK_ORDER.indexOf(a) - CAMPUS_WEEK_ORDER.indexOf(b));
  return order.map(weekdayShort).join(", ");
}

/** Relative wording for a day offset: "today", "tomorrow" or the weekday name. */
export function describeDayOffset(dayOffset: number, weekday: number): string {
  if (dayOffset === 0) return "today";
  if (dayOffset === 1) return "tomorrow";
  return weekdayName(weekday);
}

/** True when any of the given weekdays is a weekly off day (used to reject bus trips on off days). */
export const includesOffDay = (days: readonly number[]): boolean => days.some(isOffWeekday);

/** Start (inclusive) and end (exclusive) of the Friday-to-Thursday campus week that contains `date`. */
export function campusWeekRange(date: Date): { start: Date; end: Date } {
  const { dateKey, weekday } = getDhakaParts(date);
  const daysSinceStart = (weekday - CAMPUS_WEEK_START + 7) % 7;
  const startKey = addDaysToDateKey(dateKey, -daysSinceStart);
  return { start: dhakaInstant(startKey), end: dhakaInstant(addDaysToDateKey(startKey, 7)) };
}
