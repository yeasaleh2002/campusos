import type { EventStatus, RegistrationStatus } from "@/generated/prisma/enums";

/**
 * QR check-in state machine (pure).
 *
 *   REGISTERED ──scan (right event, window open)──► CHECKED_IN   (exactly once)
 *   CHECKED_IN ──scan──► ALREADY_CHECKED_IN
 *   CANCELLED  ──scan──► REGISTRATION_CANCELLED
 */

/** Doors open this long before start and close this long after the end. */
export const CHECKIN_OPENS_BEFORE_MS = 3 * 60 * 60 * 1000;
export const CHECKIN_CLOSES_AFTER_MS = 3 * 60 * 60 * 1000;

export type CheckInError =
  | "TICKET_NOT_FOUND"
  | "WRONG_EVENT"
  | "REGISTRATION_CANCELLED"
  | "ALREADY_CHECKED_IN"
  | "EVENT_NOT_ACTIVE"
  | "CHECKIN_NOT_OPEN"
  | "CHECKIN_CLOSED";

export interface CheckInCandidate {
  eventId: string;
  status: RegistrationStatus;
  event: { status: EventStatus; startAt: Date; endAt: Date };
}

export type CheckInDecision = { ok: true } | { ok: false; error: CheckInError };

/** Decides whether a scanned ticket may be checked in at `scannedEventId`. */
export function decideCheckIn(
  registration: CheckInCandidate | null,
  scannedEventId: string,
  now: Date,
): CheckInDecision {
  if (!registration) return { ok: false, error: "TICKET_NOT_FOUND" };
  if (registration.eventId !== scannedEventId) return { ok: false, error: "WRONG_EVENT" };
  if (registration.status === "CANCELLED") return { ok: false, error: "REGISTRATION_CANCELLED" };
  if (registration.status === "CHECKED_IN") return { ok: false, error: "ALREADY_CHECKED_IN" };

  const { event } = registration;
  if (event.status !== "PUBLISHED" && event.status !== "COMPLETED") return { ok: false, error: "EVENT_NOT_ACTIVE" };
  if (now.getTime() < event.startAt.getTime() - CHECKIN_OPENS_BEFORE_MS) return { ok: false, error: "CHECKIN_NOT_OPEN" };
  if (now.getTime() > event.endAt.getTime() + CHECKIN_CLOSES_AFTER_MS) return { ok: false, error: "CHECKIN_CLOSED" };
  return { ok: true };
}

export const CHECKIN_ERROR_DETAILS: Record<CheckInError, { status: number; message: string }> = {
  TICKET_NOT_FOUND: { status: 404, message: "Ticket not recognised." },
  WRONG_EVENT: { status: 409, message: "This ticket is for a different event." },
  REGISTRATION_CANCELLED: { status: 409, message: "This registration was cancelled." },
  ALREADY_CHECKED_IN: { status: 409, message: "This attendee is already checked in." },
  EVENT_NOT_ACTIVE: { status: 409, message: "This event is not active." },
  CHECKIN_NOT_OPEN: { status: 409, message: "Check-in opens 3 hours before the event starts." },
  CHECKIN_CLOSED: { status: 409, message: "Check-in for this event has closed." },
};
