import {
  type CampusClosureLite,
  type ClosureList,
  type DayStatus,
  type OffDayReason,
  type Weekday,
  addDaysToDateKey,
  describeClosedReason,
  describeDayOffset,
  describeWeekdays,
  dhakaInstant,
  getDhakaParts,
  isBusWeekday,
  statusOfDate,
  weekdayOfDateKey,
} from "@/config/campus-calendar";
import type { BusDirection } from "@/generated/prisma/enums";
import { formatClock } from "@/lib/format";

/**
 * Bus timetable maths (pure, Asia/Dhaka). Which days the bus runs comes from
 * `src/config/campus-calendar.ts` (Friday to Tuesday, minus special closures).
 *
 * A route stores its stops in TO_CAMPUS order with `offsetMinutes` from the first
 * stop (first = 0, last = campus). A TO_CAMPUS trip reaches stop S at
 * departure + offset(S); a FROM_CAMPUS trip leaves campus and reaches S at
 * departure + (total - offset(S)).
 */

const MINUTES_PER_DAY = 24 * 60;

export interface BusStop {
  name: string;
  offsetMinutes: number;
}

export interface TripLike {
  id: string;
  departureTime: string;
  direction: BusDirection;
  /** 0 = Sunday ... 6 = Saturday (Dhaka calendar). Never a weekly off day. */
  daysOfWeek: number[];
  isActive: boolean;
}

export interface Departure {
  tripId: string;
  direction: BusDirection;
  /** Stop the time refers to (route start/campus when no stop was asked for). */
  stop: string;
  /** Local Dhaka clock time at that stop, "HH:mm". */
  time: string;
  /** Absolute instant (UTC ISO when serialised). */
  at: Date;
  /** 0 = today, 1 = tomorrow, ... (Dhaka calendar). */
  dayOffset: number;
  minutesUntil: number;
}

export interface DhakaClock {
  dayOfWeek: number;
  minutes: number;
  /** `YYYY-MM-DD` on the Dhaka calendar. */
  dateKey: string;
  /** UTC instant of Dhaka midnight today. */
  midnight: number;
}

export function dhakaClock(now: Date): DhakaClock {
  const parts = getDhakaParts(now);
  return { dayOfWeek: parts.weekday, minutes: parts.minutes, dateKey: parts.dateKey, midnight: dhakaInstant(parts.dateKey).getTime() };
}

export const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const toClock = (minutes: number) => {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/** Case-insensitive stop lookup ("gabtoli" matches "Gabtoli Bus Terminal"). */
export function findStop(stops: BusStop[], query: string): BusStop | null {
  const needle = query.trim().toLowerCase();
  return stops.find((stop) => stop.name.toLowerCase() === needle) ?? stops.find((stop) => stop.name.toLowerCase().includes(needle)) ?? null;
}

/** Minutes after the trip's departure at which it reaches `stop`. */
export function minutesToStop(direction: BusDirection, stops: BusStop[], stop: BusStop): number {
  const total = stops[stops.length - 1].offsetMinutes;
  return direction === "TO_CAMPUS" ? stop.offsetMinutes : total - stop.offsetMinutes;
}

interface NextOptions {
  stop?: BusStop | null;
  direction?: BusDirection;
  limit?: number;
  /** How many days ahead to look (a long closure can skip several days). */
  lookaheadDays?: number;
  /** Special closures (cached under the `calendar` tag) on top of the weekly rule. */
  closures?: ClosureList;
}

/** Next departures (at a stop, or at each trip's origin) from `now`, soonest first. Off days and suspended days are skipped. */
export function nextDepartures(trips: TripLike[], stops: BusStop[], now: Date, options: NextOptions = {}): Departure[] {
  const clock = dhakaClock(now);
  const { stop = null, direction, limit = 3, lookaheadDays = 14, closures = [] } = options;
  const results: Departure[] = [];

  for (let dayOffset = 0; dayOffset <= lookaheadDays && results.length < limit; dayOffset++) {
    const dateKey = addDaysToDateKey(clock.dateKey, dayOffset);
    if (!statusOfDate(dateKey, closures).busService) continue;
    const dayOfWeek = weekdayOfDateKey(dateKey);
    const sameDay: Departure[] = [];
    for (const trip of trips) {
      if (!trip.isActive || !trip.daysOfWeek.includes(dayOfWeek)) continue;
      if (direction && trip.direction !== direction) continue;
      const origin = trip.direction === "TO_CAMPUS" ? stops[0] : stops[stops.length - 1];
      const at = stop ?? origin;
      const minutes = toMinutes(trip.departureTime) + minutesToStop(trip.direction, stops, at);
      if (dayOffset === 0 && minutes < clock.minutes) continue;
      const instant = dhakaInstant(dateKey, minutes);
      sameDay.push({
        tripId: trip.id,
        direction: trip.direction,
        stop: at.name,
        time: toClock(minutes),
        at: instant,
        dayOffset,
        minutesUntil: Math.round((instant.getTime() - now.getTime()) / 60_000),
      });
    }
    sameDay.sort((a, b) => a.at.getTime() - b.at.getTime());
    results.push(...sameDay);
  }
  return results.slice(0, limit);
}

/** All of today's active trips (Dhaka day), in departure order, including ones already gone. Empty on off days. */
export function todaysTrips<T extends TripLike>(trips: T[], now: Date, closures: ClosureList = []): T[] {
  const { dayOfWeek, dateKey } = dhakaClock(now);
  if (!statusOfDate(dateKey, closures).busService) return [];
  return trips
    .filter((trip) => trip.isActive && trip.daysOfWeek.includes(dayOfWeek))
    .sort((a, b) => toMinutes(a.departureTime) - toMinutes(b.departureTime));
}

/** "today", "tomorrow" or the weekday name for a departure. */
export function describeDay(dayOffset: number, at: Date): string {
  return describeDayOffset(dayOffset, getDhakaParts(at).weekday);
}

/** "Fri, Sat, Sun" style summary of operating days. */
export const describeDays = describeWeekdays;

export interface BusServiceStatus {
  /** True when the bus runs on today's Dhaka date (a weekly off day or a suspending closure makes it false). */
  service: boolean;
  reason: OffDayReason | null;
  /** Human sentence, e.g. "No bus service today (Wednesday is a weekly off day). Next service: Friday 7:00 AM." */
  message: string;
  dateKey: string;
  weekday: Weekday;
  /** Closure behind a CLOSURE reason. */
  closure: CampusClosureLite | null;
  /** True on a service day when every trip for today has already left. */
  noMoreToday: boolean;
  /** First departure after now: the next service day's first trip on an off day, or the next trip today. */
  nextService: (Omit<Departure, "at"> & { at: string; label: string }) | null;
}

/** "Friday 7:00 AM" / "tomorrow 7:00 AM" for a departure. */
export function describeDeparture(departure: Pick<Departure, "dayOffset" | "time" | "at">): string {
  return `${describeDay(departure.dayOffset, departure.at)} ${formatClock(departure.time)}`;
}

/**
 * Service state for "next bus" answers. Never returns an empty or misleading result: on an off day it
 * says so and points at the first trip of the next service day; after the last trip it does the same.
 */
export function busServiceStatus(trips: TripLike[], stops: BusStop[], now: Date, options: Omit<NextOptions, "limit"> = {}): BusServiceStatus {
  const { closures = [] } = options;
  const clock = dhakaClock(now);
  const status: DayStatus = statusOfDate(clock.dateKey, closures);
  const [next] = nextDepartures(trips, stops, now, { ...options, limit: 1 });
  const nextService = next ? { ...next, at: next.at.toISOString(), label: describeDeparture(next) } : null;
  const resume = nextService ? ` Next service: ${nextService.label}.` : " No upcoming service is scheduled.";

  if (!status.busService) {
    return {
      service: false,
      reason: status.busReason,
      message: `No bus service today (${describeClosedReason(status, "bus")}).${resume}`,
      dateKey: status.dateKey,
      weekday: status.weekday,
      closure: status.closure,
      noMoreToday: false,
      nextService,
    };
  }
  const noMoreToday = !next || next.dayOffset > 0;
  return {
    service: true,
    reason: null,
    message: noMoreToday ? `No more buses today.${resume}` : `Next bus ${describeDeparture(next)}.`,
    dateKey: status.dateKey,
    weekday: status.weekday,
    closure: status.closure,
    noMoreToday,
    nextService,
  };
}

/** Active trips running on a given weekday (0 = Sunday), in departure order. Empty on a weekly off day. */
export function tripsOnWeekday<T extends TripLike>(trips: T[], weekday: number): T[] {
  if (!isBusWeekday(weekday)) return [];
  return trips
    .filter((trip) => trip.isActive && trip.daysOfWeek.includes(weekday))
    .sort((a, b) => toMinutes(a.departureTime) - toMinutes(b.departureTime));
}
