import { describe, expect, it } from "vitest";
import {
  CHECKIN_CLOSES_AFTER_MS,
  CHECKIN_ERROR_DETAILS,
  CHECKIN_OPENS_BEFORE_MS,
  type CheckInCandidate,
  decideCheckIn,
} from "@/server/domain/checkin";

const START = new Date("2026-11-02T09:00:00Z");
const END = new Date("2026-11-02T12:00:00Z");
const DURING = new Date("2026-11-02T10:00:00Z");

const ticket = (overrides: Partial<CheckInCandidate> = {}): CheckInCandidate => ({
  eventId: "evt_a",
  status: "REGISTERED",
  event: { status: "PUBLISHED", startAt: START, endAt: END },
  ...overrides,
});

describe("decideCheckIn state machine", () => {
  it("REGISTERED + right event + open window → check in", () => {
    expect(decideCheckIn(ticket(), "evt_a", DURING)).toEqual({ ok: true });
  });

  it("unknown QR → TICKET_NOT_FOUND", () => {
    expect(decideCheckIn(null, "evt_a", DURING)).toEqual({ ok: false, error: "TICKET_NOT_FOUND" });
  });

  it("ticket for another event → WRONG_EVENT", () => {
    expect(decideCheckIn(ticket(), "evt_b", DURING)).toEqual({ ok: false, error: "WRONG_EVENT" });
  });

  it("second scan → ALREADY_CHECKED_IN", () => {
    expect(decideCheckIn(ticket({ status: "CHECKED_IN" }), "evt_a", DURING)).toEqual({ ok: false, error: "ALREADY_CHECKED_IN" });
  });

  it("cancelled registration → REGISTRATION_CANCELLED", () => {
    expect(decideCheckIn(ticket({ status: "CANCELLED" }), "evt_a", DURING)).toEqual({ ok: false, error: "REGISTRATION_CANCELLED" });
  });

  it("cancelled or draft event → EVENT_NOT_ACTIVE", () => {
    for (const status of ["CANCELLED", "DRAFT"] as const) {
      expect(decideCheckIn(ticket({ event: { status, startAt: START, endAt: END } }), "evt_a", DURING)).toEqual({ ok: false, error: "EVENT_NOT_ACTIVE" });
    }
  });

  it("completed events can still check in late arrivals inside the window", () => {
    expect(decideCheckIn(ticket({ event: { status: "COMPLETED", startAt: START, endAt: END } }), "evt_a", DURING)).toEqual({ ok: true });
  });

  it("respects the door window boundaries", () => {
    const opens = START.getTime() - CHECKIN_OPENS_BEFORE_MS;
    const closes = END.getTime() + CHECKIN_CLOSES_AFTER_MS;
    expect(decideCheckIn(ticket(), "evt_a", new Date(opens - 1))).toEqual({ ok: false, error: "CHECKIN_NOT_OPEN" });
    expect(decideCheckIn(ticket(), "evt_a", new Date(opens))).toEqual({ ok: true });
    expect(decideCheckIn(ticket(), "evt_a", new Date(closes))).toEqual({ ok: true });
    expect(decideCheckIn(ticket(), "evt_a", new Date(closes + 1))).toEqual({ ok: false, error: "CHECKIN_CLOSED" });
  });

  it("checks identity/state errors before the time window", () => {
    const tooEarly = new Date(START.getTime() - CHECKIN_OPENS_BEFORE_MS - 60_000);
    expect(decideCheckIn(ticket(), "evt_b", tooEarly)).toEqual({ ok: false, error: "WRONG_EVENT" });
  });

  it("maps every error to an HTTP status and message", () => {
    for (const detail of Object.values(CHECKIN_ERROR_DETAILS)) {
      expect([404, 409]).toContain(detail.status);
      expect(detail.message.length).toBeGreaterThan(5);
    }
  });
});
