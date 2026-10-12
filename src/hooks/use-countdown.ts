"use client";

import { useEffect, useState } from "react";

export interface Countdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
}

function diff(target: number): Countdown {
  const totalMs = Math.max(0, target - Date.now());
  return {
    totalMs,
    days: Math.floor(totalMs / 86_400_000),
    hours: Math.floor((totalMs / 3_600_000) % 24),
    minutes: Math.floor((totalMs / 60_000) % 60),
    seconds: Math.floor((totalMs / 1000) % 60),
    done: totalMs === 0,
  };
}

/** Live countdown to `target` (ISO string or Date), ticking every `intervalMs`. Null until mounted (no hydration mismatch). */
export function useCountdown(target: string | Date | null, intervalMs = 1000): Countdown | null {
  const time = target ? new Date(target).getTime() : null;
  const [state, setState] = useState<Countdown | null>(null);
  useEffect(() => {
    if (time === null) return;
    const tick = () => setState(diff(time));
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [time, intervalMs]);
  return time === null ? null : state;
}
