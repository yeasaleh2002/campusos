"use client";

import { m, useReducedMotion } from "framer-motion";
import { BusFront, MoonStar } from "lucide-react";
import { CAMPUS_WEEK_ORDER, type Weekday, isOffWeekday, weekdayName, weekdayShort } from "@/config/campus-calendar";
import { cn } from "@/lib/utils";

/**
 * Friendly "the bus is resting" state shown on off days and closures. The message comes from the
 * server-side calendar rule (`busServiceStatus`) or is built from the same helpers on the client.
 */
export function NoServiceCard({ message, compact = false, className }: { message: string; compact?: boolean; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <m.div
      initial={reduced ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.3 }}
      role="status"
      className={cn("flex items-center gap-4 rounded-2xl border border-warning/40 bg-warning-soft/60 p-4 text-fg sm:gap-5 sm:p-5", compact && "gap-3 p-3 sm:gap-3 sm:p-3", className)}
    >
      <span aria-hidden className={cn("relative grid shrink-0 place-items-center rounded-2xl bg-surface/80 shadow-sm", compact ? "size-11" : "size-14 sm:size-16")}>
        <BusFront className={cn("text-fg-muted", compact ? "size-5" : "size-7")} />
        <MoonStar className="absolute -right-1.5 -top-1.5 size-5 rounded-full bg-surface p-0.5 text-primary" />
      </span>
      <p className={cn("min-w-0 font-display font-semibold leading-snug", compact ? "text-sm" : "text-base sm:text-lg")}>{message}</p>
    </m.div>
  );
}

interface WeekdayPickerProps {
  selected: Weekday;
  today: Weekday;
  onSelect: (weekday: Weekday) => void;
}

/** Friday-first weekday selector; Wednesday and Thursday are visibly marked "Off day". */
export function WeekdayPicker({ selected, today, onSelect }: WeekdayPickerProps) {
  return (
    <div role="radiogroup" aria-label="Day of the week" className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {CAMPUS_WEEK_ORDER.map((weekday) => {
        const off = isOffWeekday(weekday);
        const active = weekday === selected;
        return (
          <button
            key={weekday}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${weekdayName(weekday)}${off ? ", off day, no service" : ""}${weekday === today ? ", today" : ""}`}
            onClick={() => onSelect(weekday)}
            className={cn(
              "relative flex min-w-0 flex-col items-center gap-0.5 rounded-xl border px-1 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:text-sm",
              active ? "border-primary bg-primary text-primary-fg shadow-sm" : off ? "border-dashed border-border bg-surface-2 text-fg-subtle hover:text-fg" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
            )}
          >
            <span className={cn(off && !active && "line-through decoration-fg-subtle/60")}>{weekdayShort(weekday)}</span>
            <span className={cn("text-[0.65rem] font-medium leading-none", active ? "text-primary-fg/80" : "text-fg-subtle")}>{off ? "Off day" : weekday === today ? "Today" : "Bus runs"}</span>
          </button>
        );
      })}
    </div>
  );
}
