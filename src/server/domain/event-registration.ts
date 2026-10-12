import type { EventStatus, RegistrationStatus } from "@/generated/prisma/enums";

/**
 * Pure registration rules. The service runs these as a fast pre-check; the seat
 * itself is claimed with a single conditional UPDATE inside a transaction, so
 * capacity can never be exceeded under concurrency (see registration.service).
 */

export type RegistrationBlocker =
  | "EVENT_NOT_OPEN"
  | "EVENT_ENDED"
  | "REGISTRATION_CLOSED"
  | "ALREADY_REGISTERED"
  | "EVENT_FULL";

export interface RegistrationEventState {
  status: EventStatus;
  startAt: Date;
  endAt: Date;
  registrationDeadline: Date | null;
  capacity: number | null;
  registrationCount: number;
}

/** Registration closes at the deadline, or at the start time when no deadline is set. */
export function registrationClosesAt(event: Pick<RegistrationEventState, "startAt" | "registrationDeadline">): Date {
  return event.registrationDeadline ?? event.startAt;
}

/** Seats remaining, or null for unlimited events. */
export function spotsLeft(capacity: number | null, registrationCount: number): number | null {
  return capacity === null ? null : Math.max(0, capacity - registrationCount);
}

/** Returns why a user cannot register right now, or null if they can. */
export function registrationBlocker(
  event: RegistrationEventState,
  existingStatus: RegistrationStatus | null,
  now: Date,
): RegistrationBlocker | null {
  if (event.status !== "PUBLISHED") return "EVENT_NOT_OPEN";
  if (event.endAt.getTime() <= now.getTime()) return "EVENT_ENDED";
  if (registrationClosesAt(event).getTime() <= now.getTime()) return "REGISTRATION_CLOSED";
  if (existingStatus === "REGISTERED" || existingStatus === "CHECKED_IN") return "ALREADY_REGISTERED";
  if (spotsLeft(event.capacity, event.registrationCount) === 0) return "EVENT_FULL";
  return null;
}

export const REGISTRATION_BLOCKER_MESSAGES: Record<RegistrationBlocker, string> = {
  EVENT_NOT_OPEN: "This event is not open for registration.",
  EVENT_ENDED: "This event has already ended.",
  REGISTRATION_CLOSED: "Registration for this event has closed.",
  ALREADY_REGISTERED: "You are already registered for this event.",
  EVENT_FULL: "This event is full.",
};
