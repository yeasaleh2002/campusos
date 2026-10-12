"use client";

import { useCountdown } from "@/hooks/use-countdown";
import { cn } from "@/lib/utils";

/** "in 12 min" / "in 1h 05m" / "departing now" - ticks every 15s, server renders the static fallback. */
export function DepartureCountdown({ at, fallback, className }: { at: string; fallback: string; className?: string }) {
  const countdown = useCountdown(at, 15_000);
  let text = fallback;
  if (countdown) {
    const totalMinutes = Math.ceil(countdown.totalMs / 60_000);
    if (countdown.done || totalMinutes <= 0) text = "departing now";
    else if (totalMinutes < 60) text = `in ${totalMinutes} min`;
    else if (countdown.days > 0) text = `in ${countdown.days}d ${countdown.hours}h`;
    else text = `in ${Math.floor(totalMinutes / 60)}h ${String(totalMinutes % 60).padStart(2, "0")}m`;
  }
  return (
    <span className={cn("tabular-nums", className)} aria-live="off">
      {text}
    </span>
  );
}
