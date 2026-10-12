import {
  type ClosureList,
  type Weekday,
  addDaysToDateKey,
  daysBetween,
  describeClosedReason,
  describeOffDays,
  describeWorkingDays,
  dhakaInstant,
  getDhakaDateKey,
  getNextOpenDay,
  statusOfDate,
  weekdayName,
  weekdayOfDateKey,
} from "@/config/campus-calendar";

/**
 * Pure answers for calendar questions ("is the university open tomorrow?", "which days does the bus run?").
 * Every weekday comes from `campus-calendar` on the Asia/Dhaka calendar; nothing here reads the server's UTC day.
 */

export interface TargetDay {
  dateKey: string;
  weekday: Weekday;
  /** Calendar days from today (0 = today). */
  dayOffset: number;
  /** "today (Wednesday)", "tomorrow (Thursday)" or "on Friday (in 2 days)". */
  label: string;
}

const SEVEN_DAYS = 7;

/** The date a question is about: a named weekday (its next occurrence, today included), tomorrow, or today. */
export function resolveTargetDay(now: Date, options: { weekday?: Weekday | null; dayOffset?: number } = {}): TargetDay {
  const todayKey = getDhakaDateKey(now);
  let dayOffset = options.dayOffset ?? 0;
  if (options.weekday !== null && options.weekday !== undefined) {
    dayOffset = Array.from({ length: SEVEN_DAYS }, (_, offset) => offset).find((offset) => weekdayOfDateKey(addDaysToDateKey(todayKey, offset)) === options.weekday) ?? 0;
  }
  const dateKey = addDaysToDateKey(todayKey, dayOffset);
  const weekday = weekdayOfDateKey(dateKey);
  const label = dayOffset === 0 ? `today (${weekdayName(weekday)})` : dayOffset === 1 ? `tomorrow (${weekdayName(weekday)})` : `on ${weekdayName(weekday)} (in ${dayOffset} days)`;
  return { dateKey, weekday, dayOffset, label };
}

function describeUpcoming(dateKey: string, fromKey: string): string {
  const offset = daysBetween(fromKey, dateKey);
  const name = weekdayName(weekdayOfDateKey(dateKey));
  return offset === 1 ? `tomorrow (${name})` : `${name} (in ${offset} days)`;
}

/** "Is the university open today / tomorrow / on Wednesday?" */
export function campusStatusAnswer(now: Date, closures: ClosureList, target: TargetDay): string {
  const status = statusOfDate(target.dateKey, closures);
  const busLine = status.busService ? "The bus runs that day." : `There is no bus service ${target.dayOffset === 0 ? "today" : "that day"} (${describeClosedReason(status, "bus")}).`;

  if (status.open) return `Yes, City University is open ${target.label}. ${busLine}`;

  const next = getNextOpenDay(dhakaInstant(target.dateKey), closures);
  const resume = next ? ` The next open day is ${describeUpcoming(next.dateKey, getDhakaDateKey(now))}.` : "";
  return `No, City University is closed ${target.label}: ${describeClosedReason(status)}. ${busLine}${resume}`;
}

/** "When is the next working day?" */
export function nextWorkingDayAnswer(now: Date, closures: ClosureList): string {
  const todayKey = getDhakaDateKey(now);
  const today = statusOfDate(todayKey, closures);
  const next = getNextOpenDay(now, closures);
  const nextText = next ? describeUpcoming(next.dateKey, todayKey) : "not scheduled in the next few months";
  if (today.open) return `Today (${weekdayName(today.weekday)}) is a working day. After today, the next working day is ${nextText}.`;
  return `Today (${weekdayName(today.weekday)}) is not a working day (${describeClosedReason(today)}). The next working day is ${nextText}.`;
}

/** "Which days is the bus available?" */
export function busDaysAnswer(now: Date, closures: ClosureList): string {
  const todayKey = getDhakaDateKey(now);
  const today = statusOfDate(todayKey, closures);
  const upcoming = closures.filter((closure) => closure.suspendsBus && closure.dateKey >= todayKey).slice(0, 3);
  const closureText = upcoming.length > 0 ? ` Upcoming special closures: ${upcoming.map((closure) => `${closure.dateKey} (${closure.title})`).join(", ")}.` : "";
  const todayText = today.busService ? "The bus is running today." : `There is no bus service today (${describeClosedReason(today, "bus")}).`;
  return `Buses run ${describeWorkingDays()}. There is no bus service on ${describeOffDays()} (weekly off days) or on special closure days.${closureText} ${todayText}`;
}
