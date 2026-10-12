const DHAKA_OFFSET_MS = 6 * 3600 * 1000;

/** `2026-11-02T15:00` (a datetime-local value, Dhaka wall clock) → ISO string with +06:00. */
export function dhakaLocalToIso(local: string): string {
  return `${local}:00+06:00`;
}

/** ISO instant → `YYYY-MM-DDTHH:mm` on the Dhaka wall clock, for datetime-local inputs. */
export function isoToDhakaLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(new Date(iso).getTime() + DHAKA_OFFSET_MS).toISOString().slice(0, 16);
}

/** Dhaka "now" as a datetime-local value (used as `min` for pickers). */
export function dhakaNowLocal(): string {
  return isoToDhakaLocal(new Date().toISOString());
}
