import { describe, expect, it } from "vitest";
import {
  type RegistrationEventState,
  registrationBlocker,
  registrationClosesAt,
  spotsLeft,
} from "@/server/domain/event-registration";

const NOW = new Date("2026-10-07T10:00:00Z");
const hours = (h: number) => new Date(NOW.getTime() + h * 3_600_000);

const openEvent = (overrides: Partial<RegistrationEventState> = {}): RegistrationEventState => ({
  status: "PUBLISHED",
  startAt: hours(48),
  endAt: hours(51),
  registrationDeadline: hours(24),
  capacity: 100,
  registrationCount: 10,
  ...overrides,
});

describe("spotsLeft", () => {
  it("is null for unlimited events", () => expect(spotsLeft(null, 5_000)).toBeNull());
  it("counts remaining seats", () => expect(spotsLeft(100, 97)).toBe(3));
  it("never goes negative", () => expect(spotsLeft(10, 12)).toBe(0));
});

describe("registrationClosesAt", () => {
  it("uses the deadline when set", () => expect(registrationClosesAt(openEvent())).toEqual(hours(24)));
  it("falls back to the start time", () => expect(registrationClosesAt(openEvent({ registrationDeadline: null }))).toEqual(hours(48)));
});

describe("registrationBlocker (capacity, deadline, status)", () => {
  it("allows a normal registration", () => {
    expect(registrationBlocker(openEvent(), null, NOW)).toBeNull();
  });

  it("allows the very last seat and blocks the next one", () => {
    expect(registrationBlocker(openEvent({ capacity: 100, registrationCount: 99 }), null, NOW)).toBeNull();
    expect(registrationBlocker(openEvent({ capacity: 100, registrationCount: 100 }), null, NOW)).toBe("EVENT_FULL");
  });

  it("never fills an unlimited event", () => {
    expect(registrationBlocker(openEvent({ capacity: null, registrationCount: 1_000_000 }), null, NOW)).toBeNull();
  });

  it("blocks drafts and cancelled events", () => {
    expect(registrationBlocker(openEvent({ status: "DRAFT" }), null, NOW)).toBe("EVENT_NOT_OPEN");
    expect(registrationBlocker(openEvent({ status: "CANCELLED" }), null, NOW)).toBe("EVENT_NOT_OPEN");
  });

  it("closes exactly at the deadline", () => {
    const event = openEvent();
    expect(registrationBlocker(event, null, new Date(hours(24).getTime() - 1))).toBeNull();
    expect(registrationBlocker(event, null, hours(24))).toBe("REGISTRATION_CLOSED");
  });

  it("reports ended events before closed registration", () => {
    expect(registrationBlocker(openEvent(), null, hours(60))).toBe("EVENT_ENDED");
  });

  it("blocks duplicates but lets a cancelled registrant re-register", () => {
    expect(registrationBlocker(openEvent(), "REGISTERED", NOW)).toBe("ALREADY_REGISTERED");
    expect(registrationBlocker(openEvent(), "CHECKED_IN", NOW)).toBe("ALREADY_REGISTERED");
    expect(registrationBlocker(openEvent(), "CANCELLED", NOW)).toBeNull();
  });

  it("reports duplicates before fullness (a registrant of a full event sees 'already registered')", () => {
    expect(registrationBlocker(openEvent({ registrationCount: 100 }), "REGISTERED", NOW)).toBe("ALREADY_REGISTERED");
  });
});

describe("atomic seat claim (simulated)", () => {
  /** Mirrors the SQL guard: UPDATE ... WHERE capacity IS NULL OR registrationCount < capacity. */
  function claimSeat(event: { capacity: number | null; registrationCount: number }): boolean {
    if (event.capacity !== null && event.registrationCount >= event.capacity) return false;
    event.registrationCount += 1;
    return true;
  }

  it("never exceeds capacity when 500 users race for 50 seats", async () => {
    const event = { capacity: 50, registrationCount: 0 };
    // Each claim is a single synchronous step, exactly like one row-locked UPDATE.
    const results = await Promise.all(Array.from({ length: 500 }, () => Promise.resolve().then(() => claimSeat(event))));
    expect(results.filter(Boolean)).toHaveLength(50);
    expect(event.registrationCount).toBe(50);
  });
});
