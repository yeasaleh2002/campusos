import { CAMPUS_WEEK_ORDER, type Weekday } from "@/config/campus-calendar";
import { weekdayConcept } from "@/config/chatbot-synonyms";
import { conceptOf, type NormalizedMessage } from "@/server/chatbot/normalize";

/**
 * Deterministic intents answered from structured tables (real-time, never from
 * free text). Detection is pure keyword logic over normalised concepts.
 */
export type ChatIntent =
  | "NEXT_BUS"
  | "BUS_TODAY"
  | "BUS_ON_DAY"
  | "BUS_DAYS"
  | "CAMPUS_STATUS"
  | "NEXT_WORKING_DAY"
  | "OPEN_FORMS"
  | "EVENTS_THIS_WEEK"
  | "CLASS_CANCELLATION";

export interface DetectedIntent {
  intent: ChatIntent;
  /** Tokens that might name a bus route or stop (e.g. "dhanmondi", "r2"). */
  routeHints: string[];
  /** A weekday named in the question ("bus on wednesday", "বুধবার"). */
  weekday?: Weekday | null;
  /** 1 when the question is about tomorrow ("kalke university khola?"), otherwise 0. */
  dayOffset?: number;
}

const has = (message: NormalizedMessage, ...concepts: string[]) => concepts.every((c) => message.concepts.has(c));
const hasAny = (message: NormalizedMessage, ...concepts: string[]) => concepts.some((c) => message.concepts.has(c));

/** Words that describe a bus question rather than name a place. */
const BUS_NOISE = new Set(["bus", "buses", "shuttle", "next", "today", "schedule", "time", "route", "stop", "campus", "university", "city", "leave", "leaves", "departure", "go", "goes", "kokhon", "kobe", "porer", "aj", "aaj", "ajke", "jabe", "chare", "chhare", "ছাড়বে", "যাবে"]);

/** Concepts that mean the question is about something other than whether the campus is open. */
const OTHER_TOPICS = ["library", "exam", "fee", "idCard", "attendance", "admission", "result", "hostel", "scholarship", "registration", "wifi", "canteen", "certificate", "retake", "form", "event", "notice", "complaint", "lost"];

/** The weekday a question names, if any (English, Banglish or Bangla). */
export function weekdayOf(message: NormalizedMessage): Weekday | null {
  return CAMPUS_WEEK_ORDER.find((weekday) => message.concepts.has(weekdayConcept(weekday))) ?? null;
}

const mentionsCampus = (message: NormalizedMessage) => message.concepts.has("university") || message.tokens.includes("campus");

export function detectIntent(message: NormalizedMessage): DetectedIntent | null {
  const routeHints = message.tokens.filter((token) => !BUS_NOISE.has(token) && !conceptOf(token));
  const weekday = weekdayOf(message);
  const dayOffset = message.concepts.has("tomorrow") ? 1 : 0;

  if (message.concepts.has("bus")) {
    if (weekday !== null || dayOffset === 1) return { intent: "BUS_ON_DAY", routeHints, weekday, dayOffset };
    if (message.concepts.has("days") && !message.concepts.has("today") && !hasAny(message, "next")) return { intent: "BUS_DAYS", routeHints: [] };
    if (message.concepts.has("today")) return { intent: "BUS_TODAY", routeHints };
    if (hasAny(message, "next", "when")) return { intent: "NEXT_BUS", routeHints };
    if (message.concepts.has("schedule")) return { intent: "BUS_TODAY", routeHints };
    if (message.concepts.has("open")) return { intent: "BUS_TODAY", routeHints };
    return null;
  }
  if (has(message, "class", "cancel") || has(message, "notice", "cancel")) {
    return { intent: "CLASS_CANCELLATION", routeHints: [] };
  }
  if (message.concepts.has("workday") && hasAny(message, "next", "when")) {
    return { intent: "NEXT_WORKING_DAY", routeHints: [] };
  }
  const otherTopic = hasAny(message, ...OTHER_TOPICS);
  if (!otherTopic) {
    const asksOpen = hasAny(message, "open", "holiday", "cancel");
    if (message.concepts.has("holiday") || (mentionsCampus(message) && asksOpen) || (weekday !== null && hasAny(message, "open", "class"))) {
      return { intent: "CAMPUS_STATUS", routeHints: [], weekday, dayOffset };
    }
  }
  if (message.concepts.has("form") && hasAny(message, "open", "deadline", "next", "when")) {
    return { intent: "OPEN_FORMS", routeHints: [] };
  }
  if (message.concepts.has("deadline") && !message.concepts.has("fee")) {
    return { intent: "OPEN_FORMS", routeHints: [] };
  }
  if (message.concepts.has("event") && hasAny(message, "week", "next", "today", "when")) {
    return { intent: "EVENTS_THIS_WEEK", routeHints: [] };
  }
  return null;
}

/** Picks the route whose code or name best matches the hints (null when ambiguous/absent). */
export function matchRoute<T extends { code: string; name: string; stopNames: string[] }>(hints: string[], routes: T[]): T | null {
  if (hints.length === 0) return null;
  let best: T | null = null;
  let bestScore = 0;
  for (const route of routes) {
    const haystack = [route.code, route.name, ...route.stopNames].join(" ").toLowerCase();
    const score = hints.filter((hint) => hint.length >= 2 && (hint === route.code.toLowerCase() || haystack.includes(hint))).length;
    if (score > bestScore) {
      best = route;
      bestScore = score;
    }
  }
  return best;
}
