"use client";

import { useEffect, useState } from "react";

/**
 * The current instant, refreshed every `intervalMs` (default 30 s) so day-dependent screens roll over
 * at Dhaka midnight without any time-based revalidation. Null until mounted, so the server render
 * and the first client render match. Weekday maths on this value goes through `campus-calendar`.
 */
export function useDhakaNow(intervalMs = 30_000): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [intervalMs]);
  return now;
}
