/**
 * Bangladesh (Asia/Dhaka) is UTC+6 with no daylight saving, so campus-local
 * calendar maths can use a fixed offset without a timezone library.
 */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** UTC range covering a Dhaka calendar month given as "YYYY-MM". */
export function dhakaMonthRange(month: string): { start: Date; end: Date } {
  const [year, monthIndex] = month.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, monthIndex - 1, 1) - DHAKA_OFFSET_MS),
    end: new Date(Date.UTC(year, monthIndex, 1) - DHAKA_OFFSET_MS),
  };
}

/**
 * Truncates to the hour. Cached fetchers that depend on "now" take this as an
 * argument, so a cache entry is reused for at most an hour of wall-clock drift
 * (the key changes - this is not time-based revalidation).
 */
export function hourBucket(now: Date = new Date()): string {
  const bucket = new Date(now);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket.toISOString();
}
