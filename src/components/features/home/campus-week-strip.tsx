"use client";

import { BusFront, Ban } from "lucide-react";
import { CAMPUS_WEEK_ORDER, describeOffDays, describeWorkingDays, getDhakaWeekday, isBusWeekday, isWorkingWeekday, weekdayName, weekdayShort } from "@/config/campus-calendar";
import { useDhakaNow } from "@/hooks/use-dhaka-now";
import { cn } from "@/lib/utils";

/**
 * The campus week at a glance: Friday to Thursday, with the weekly off days and the bus rule marked, and today
 * highlighted (worked out in the browser from the Dhaka clock; the prerendered HTML has no "today").
 */
export function CampusWeekStrip({ className }: { className?: string }) {
  const now = useDhakaNow(60_000);
  const today = now ? getDhakaWeekday(now) : null;
  return (
    <div className={cn("glass rounded-3xl p-5 shadow-md sm:p-6", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-lg font-semibold">The campus week</h3>
        <p className="text-sm text-fg-muted">
          Open {describeWorkingDays()}. No classes or buses on {describeOffDays()}.
        </p>
      </div>
      <ol className="mt-5 grid grid-cols-7 gap-1.5 sm:gap-3" aria-label="Campus week, Friday to Thursday">
        {CAMPUS_WEEK_ORDER.map((weekday) => {
          const open = isWorkingWeekday(weekday);
          const isToday = today === weekday;
          return (
            <li
              key={weekday}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "relative flex min-w-0 flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center transition duration-300 sm:py-4",
                open ? "border-border bg-surface" : "border-dashed border-border-strong bg-surface-2/70 text-fg-subtle",
                isToday && "border-primary bg-primary-soft/60 shadow-glow ring-2 ring-primary/40",
              )}
            >
              <span className="text-xs font-bold uppercase tracking-wider sm:text-sm">{weekdayShort(weekday)}</span>
              <span className={cn("grid size-8 place-items-center rounded-full sm:size-9", open ? "bg-success-soft text-success" : "bg-surface-3 text-fg-subtle")} aria-hidden>
                {isBusWeekday(weekday) ? <BusFront className="size-4" /> : <Ban className="size-4" />}
              </span>
              <span className="text-[0.65rem] font-semibold sm:text-xs">{open ? "Open" : "Off day"}</span>
              <span className="sr-only">
                {weekdayName(weekday)}: {open ? "campus open, buses run" : "campus closed, no bus service"}
                {isToday ? ", today" : ""}
              </span>
              {isToday && <span className="absolute -top-2 rounded-full bg-primary px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide text-primary-fg">Today</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
