/**
 * Date/number formatting pinned to Asia/Dhaka + en-GB so server and client
 * render identical strings (no hydration mismatch, correct campus time).
 */

const TZ = "Asia/Dhaka";

const formatters = {
  date: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }),
  dateShort: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }),
  weekdayDate: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }),
  dateTime: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true }),
  time: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }),
  day: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit" }),
  month: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, month: "short" }),
  full: new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "long", year: "numeric" }),
};

type DateInput = Date | string | number;
const toDate = (value: DateInput) => (value instanceof Date ? value : new Date(value));

export const formatDate = (value: DateInput) => formatters.date.format(toDate(value));
export const formatDateShort = (value: DateInput) => formatters.dateShort.format(toDate(value));
export const formatWeekdayDate = (value: DateInput) => formatters.weekdayDate.format(toDate(value));
export const formatDateTime = (value: DateInput) => formatters.dateTime.format(toDate(value)).replace(" at ", ", ");
export const formatTime = (value: DateInput) => formatters.time.format(toDate(value)).toUpperCase();
export const formatFullDate = (value: DateInput) => formatters.full.format(toDate(value));

/** { day: "07", month: "Oct" } for date chips. */
export function dateChip(value: DateInput): { day: string; month: string } {
  const date = toDate(value);
  return { day: formatters.day.format(date), month: formatters.month.format(date) };
}

/** "10:00 AM – 1:00 PM" (same day) or full range otherwise. */
export function formatTimeRange(start: DateInput, end: DateInput): string {
  const s = toDate(start);
  const e = toDate(end);
  const sameDay = formatters.date.format(s) === formatters.date.format(e);
  return sameDay ? `${formatTime(s)} – ${formatTime(e)}` : `${formatDateTime(s)} – ${formatDateTime(e)}`;
}

/** "3 min ago", "in 2 days" (relative to `now`). */
export function formatRelative(value: DateInput, now: Date = new Date()): string {
  const diff = toDate(value).getTime() - now.getTime();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 864e5],
    ["month", 30 * 864e5],
    ["week", 7 * 864e5],
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const formatNumber = (value: number) => value.toLocaleString("en-US");

/** "HH:mm" (24h, from the bus API) → "7:15 AM". */
export function formatClock(hhmm: string): string {
  const [h = 0, m = 0] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** Strip to plain text and trim to `length` characters for excerpts/meta descriptions. */
export function excerpt(text: string, length = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > length ? `${clean.slice(0, length - 1).trimEnd()}…` : clean;
}
