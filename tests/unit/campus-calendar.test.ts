import { describe, expect, it } from "vitest";
import {
  BUS_SERVICE_DAYS,
  type CampusClosureLite,
  OFF_DAYS,
  WEEKDAY,
  WORKING_DAYS,
  campusWeekRange,
  dhakaInstant,
  getDhakaDateKey,
  getDhakaParts,
  getDhakaWeekday,
  getNextOpenDay,
  getNextServiceDay,
  isBusServiceDay,
  isCampusOpen,
  statusOf,
} from "@/config/campus-calendar";
import { busDaysAnswer, campusStatusAnswer, nextWorkingDayAnswer, resolveTargetDay } from "@/server/chatbot/calendar-answers";
import { detectIntent } from "@/server/chatbot/intents";
import { normalizeMessage } from "@/server/chatbot/normalize";
import { assertBusServiceDays } from "@/server/domain/bus-days";
import { type BusStop, type TripLike, busServiceStatus, nextDepartures, todaysTrips, tripsOnWeekday } from "@/server/domain/bus-schedule";

/** Dhaka wall-clock instant, e.g. dhaka("2026-10-14", "10:00"). 2026-10-09 is a Friday. */
const dhaka = (date: string, time = "12:00") => new Date(`${date}T${time}:00+06:00`);

const FRIDAY = "2026-10-09";
const SATURDAY = "2026-10-10";
const SUNDAY = "2026-10-11";
const MONDAY = "2026-10-12";
const TUESDAY = "2026-10-13";
const WEDNESDAY = "2026-10-14";
const THURSDAY = "2026-10-15";

const STOPS: BusStop[] = [
  { name: "Mirpur 10", offsetMinutes: 0 },
  { name: "City University Campus", offsetMinutes: 40 },
];

const TRIPS: TripLike[] = [
  { id: "t1", departureTime: "07:00", direction: "TO_CAMPUS", daysOfWeek: [...BUS_SERVICE_DAYS], isActive: true },
  { id: "t2", departureTime: "16:30", direction: "FROM_CAMPUS", daysOfWeek: [...BUS_SERVICE_DAYS], isActive: true },
];

const closure = (dateKey: string, overrides: Partial<CampusClosureLite> = {}): CampusClosureLite => ({ dateKey, title: "Victory Day", closesCampus: true, suspendsBus: true, ...overrides });

describe("weekly rule (Asia/Dhaka)", () => {
  it.each([
    [FRIDAY, WEEKDAY.FRIDAY, true],
    [SATURDAY, WEEKDAY.SATURDAY, true],
    [SUNDAY, WEEKDAY.SUNDAY, true],
    [MONDAY, WEEKDAY.MONDAY, true],
    [TUESDAY, WEEKDAY.TUESDAY, true],
    [WEDNESDAY, WEEKDAY.WEDNESDAY, false],
    [THURSDAY, WEEKDAY.THURSDAY, false],
  ])("%s is weekday %i and the campus open flag is %s", (date, weekday, open) => {
    const noon = dhaka(date);
    expect(getDhakaWeekday(noon)).toBe(weekday);
    expect(isCampusOpen(noon)).toBe(open);
    expect(isBusServiceDay(noon)).toBe(open);
  });

  it("declares Friday to Tuesday as working days and Wednesday and Thursday as off days", () => {
    expect([...WORKING_DAYS].sort()).toEqual([WEEKDAY.SUNDAY, WEEKDAY.MONDAY, WEEKDAY.TUESDAY, WEEKDAY.FRIDAY, WEEKDAY.SATURDAY]);
    expect([...OFF_DAYS].sort()).toEqual([WEEKDAY.WEDNESDAY, WEEKDAY.THURSDAY]);
    expect([...BUS_SERVICE_DAYS]).toEqual([...WORKING_DAYS]);
  });

  it("uses the Dhaka day, not the server's UTC day, after 18:00 UTC", () => {
    // Tuesday 19:00 UTC is already Wednesday 01:00 in Dhaka.
    const instant = new Date("2026-10-13T19:00:00Z");
    expect(instant.getUTCDay()).toBe(WEEKDAY.TUESDAY);
    expect(getDhakaWeekday(instant)).toBe(WEEKDAY.WEDNESDAY);
    expect(isCampusOpen(instant)).toBe(false);
    expect(getDhakaDateKey(instant)).toBe(WEDNESDAY);
  });

  it("rolls over exactly at Dhaka midnight", () => {
    expect(getDhakaParts(new Date("2026-10-14T17:59:00Z")).weekday).toBe(WEEKDAY.WEDNESDAY);
    expect(getDhakaParts(new Date("2026-10-14T18:00:00Z")).weekday).toBe(WEEKDAY.THURSDAY);
    expect(getDhakaParts(new Date("2026-10-15T18:00:00Z")).weekday).toBe(WEEKDAY.FRIDAY);
  });

  it("finds the next service and open days across the weekly off days", () => {
    expect(getNextServiceDay(dhaka(TUESDAY, "22:00"))?.dateKey).toBe("2026-10-16");
    expect(getNextServiceDay(dhaka(WEDNESDAY))?.dayOffset).toBe(2);
    expect(getNextServiceDay(dhaka(THURSDAY))?.weekday).toBe(WEEKDAY.FRIDAY);
    expect(getNextServiceDay(dhaka(FRIDAY))?.weekday).toBe(WEEKDAY.SATURDAY);
    expect(getNextServiceDay(dhaka(FRIDAY), [], true)?.dayOffset).toBe(0);
    expect(getNextOpenDay(dhaka(WEDNESDAY))?.dateKey).toBe("2026-10-16");
  });

  it("counts the campus week from Friday to Thursday", () => {
    const { start, end } = campusWeekRange(dhaka(WEDNESDAY));
    expect(start.toISOString()).toBe(dhakaInstant(FRIDAY).toISOString());
    expect(end.toISOString()).toBe(dhakaInstant("2026-10-16").toISOString());
    // Thursday late evening is still the same week; Friday 00:30 starts the next one.
    expect(campusWeekRange(dhaka(THURSDAY, "23:30")).start.toISOString()).toBe(dhakaInstant(FRIDAY).toISOString());
    expect(campusWeekRange(dhaka("2026-10-16", "00:30")).start.toISOString()).toBe(dhakaInstant("2026-10-16").toISOString());
  });
});

describe("special closures override the weekly rule", () => {
  it("closes the campus and suspends the bus on a Monday holiday", () => {
    const closures = [closure(MONDAY)];
    const status = statusOf(dhaka(MONDAY), closures);
    expect(status.open).toBe(false);
    expect(status.busService).toBe(false);
    expect(status.campusReason).toBe("CLOSURE");
    expect(getNextServiceDay(dhaka(SUNDAY, "22:00"), closures)?.weekday).toBe(WEEKDAY.TUESDAY);
  });

  it("can suspend only the bus while the campus stays open", () => {
    const closures = [closure(SUNDAY, { closesCampus: false, title: "Exam-day bus change" })];
    expect(isCampusOpen(dhaka(SUNDAY), closures)).toBe(true);
    expect(isBusServiceDay(dhaka(SUNDAY), closures)).toBe(false);
  });

  it("keeps the weekly off-day reason when a closure falls on a Wednesday", () => {
    const status = statusOf(dhaka(WEDNESDAY), [closure(WEDNESDAY)]);
    expect(status.campusReason).toBe("OFF_DAY");
    expect(status.busReason).toBe("OFF_DAY");
  });
});

describe("next bus around the off days", () => {
  it("Tuesday night: no more buses today, next service is Friday morning", () => {
    const status = busServiceStatus(TRIPS, STOPS, dhaka(TUESDAY, "22:00"));
    expect(status.service).toBe(true);
    expect(status.noMoreToday).toBe(true);
    expect(status.nextService?.label).toBe("Friday 7:00 AM");
    expect(status.message).toContain("No more buses today");
  });

  it("Wednesday: no service (OFF_DAY) and the next service is the first trip on Friday", () => {
    const status = busServiceStatus(TRIPS, STOPS, dhaka(WEDNESDAY, "10:00"));
    expect(status.service).toBe(false);
    expect(status.reason).toBe("OFF_DAY");
    expect(status.message).toBe("No bus service today (Wednesday is a weekly off day). Next service: Friday 7:00 AM.");
    expect(status.nextService?.at).toBe(dhaka("2026-10-16", "07:00").toISOString());
  });

  it("Thursday: no service and the next service is Friday 7:00 AM", () => {
    const status = busServiceStatus(TRIPS, STOPS, dhaka(THURSDAY, "08:00"));
    expect(status.service).toBe(false);
    expect(status.nextService?.label).toBe("tomorrow 7:00 AM");
    expect(nextDepartures(TRIPS, STOPS, dhaka(THURSDAY, "08:00"), { limit: 1 })[0].dayOffset).toBe(1);
  });

  it("Friday early morning: the 7:00 trip is next, today", () => {
    const status = busServiceStatus(TRIPS, STOPS, dhaka("2026-10-16", "05:00"));
    expect(status.service).toBe(true);
    expect(status.noMoreToday).toBe(false);
    expect(status.nextService?.dayOffset).toBe(0);
    expect(status.nextService?.time).toBe("07:00");
  });

  it("a suspending closure reports CLOSURE with its title and skips that day", () => {
    const closures = [closure(MONDAY)];
    const status = busServiceStatus(TRIPS, STOPS, dhaka(MONDAY, "09:00"), { closures });
    expect(status.service).toBe(false);
    expect(status.reason).toBe("CLOSURE");
    expect(status.message).toContain("Victory Day");
    expect(status.nextService?.label).toBe("tomorrow 7:00 AM");
    expect(todaysTrips(TRIPS, dhaka(MONDAY, "09:00"), closures)).toEqual([]);
  });

  it("never lists trips for a weekly off day", () => {
    expect(tripsOnWeekday(TRIPS, WEEKDAY.WEDNESDAY)).toEqual([]);
    expect(tripsOnWeekday(TRIPS, WEEKDAY.THURSDAY)).toEqual([]);
    expect(tripsOnWeekday(TRIPS, WEEKDAY.FRIDAY)).toHaveLength(2);
  });
});

describe("admin bus trip validation", () => {
  it.each([[[WEEKDAY.WEDNESDAY]], [[WEEKDAY.THURSDAY]], [[WEEKDAY.FRIDAY, WEEKDAY.THURSDAY]]])("rejects %j with BUS_DAY_NOT_ALLOWED", (days) => {
    expect(() => assertBusServiceDays(days)).toThrowError(expect.objectContaining({ code: "BUS_DAY_NOT_ALLOWED", status: 422 }));
  });

  it("accepts Friday to Tuesday and an update that leaves the days alone", () => {
    expect(() => assertBusServiceDays([...BUS_SERVICE_DAYS])).not.toThrow();
    expect(() => assertBusServiceDays(undefined)).not.toThrow();
  });
});

describe("chatbot: calendar intents (English, Banglish, Bangla)", () => {
  const detect = (text: string) => detectIntent(normalizeMessage(text));

  it.each([
    ["is the university open tomorrow?", "CAMPUS_STATUS"],
    ["kalke university khola?", "CAMPUS_STATUS"],
    ["is the university open today", "CAMPUS_STATUS"],
    ["ajke chuti?", "CAMPUS_STATUS"],
    ["ছুটি", "CAMPUS_STATUS"],
    ["বৃহস্পতিবার ছুটি?", "CAMPUS_STATUS"],
    ["when is the next working day", "NEXT_WORKING_DAY"],
    ["which days is the bus available", "BUS_DAYS"],
    ["bus kon kon din ache", "BUS_DAYS"],
    ["bus on wednesday?", "BUS_ON_DAY"],
    ["বুধবার বাস আছে?", "BUS_ON_DAY"],
    ["bus tomorrow", "BUS_ON_DAY"],
    ["bus ache?", "BUS_TODAY"],
    ["ajke bus", "BUS_TODAY"],
    ["next bus to mirpur", "NEXT_BUS"],
  ])("%j → %s", (text, intent) => {
    expect(detect(text)?.intent).toBe(intent);
  });

  it("extracts the weekday and the tomorrow flag", () => {
    expect(detect("bus on wednesday?")?.weekday).toBe(WEEKDAY.WEDNESDAY);
    expect(detect("বৃহস্পতিবার ছুটি?")?.weekday).toBe(WEEKDAY.THURSDAY);
    expect(detect("kalke university khola?")?.dayOffset).toBe(1);
  });

  it("keeps class cancellations and library questions out of the calendar intents", () => {
    expect(detect("ajke class bondho?")?.intent).toBe("CLASS_CANCELLATION");
    expect(detect("is the library open on friday")).toBeNull();
  });
});

describe("chatbot: calendar answers", () => {
  const today = (date: string, time = "10:00") => resolveTargetDay(dhaka(date, time));

  it("on Wednesday the bot says the university is closed, there is no bus, and when it reopens", () => {
    const answer = campusStatusAnswer(dhaka(WEDNESDAY), [], today(WEDNESDAY));
    expect(answer).toContain("No, City University is closed today (Wednesday)");
    expect(answer).toContain("no bus service");
    expect(answer).toContain("next open day is Friday");
  });

  it("on Tuesday evening 'tomorrow' is Wednesday: closed", () => {
    const now = dhaka(TUESDAY, "20:00");
    const answer = campusStatusAnswer(now, [], resolveTargetDay(now, { dayOffset: 1 }));
    expect(answer).toContain("closed tomorrow (Wednesday)");
  });

  it("on a working day it says yes and that the bus runs", () => {
    const answer = campusStatusAnswer(dhaka(SATURDAY), [], today(SATURDAY));
    expect(answer).toMatch(/^Yes, City University is open today \(Saturday\)\. The bus runs that day\.$/);
  });

  it("resolves a named weekday to its next occurrence", () => {
    const target = resolveTargetDay(dhaka(SATURDAY), { weekday: WEEKDAY.WEDNESDAY });
    expect(target.dateKey).toBe(WEDNESDAY);
    expect(target.dayOffset).toBe(4);
    expect(target.label).toBe("on Wednesday (in 4 days)");
  });

  it("explains the next working day from an off day and from a working day", () => {
    expect(nextWorkingDayAnswer(dhaka(THURSDAY), [])).toContain("The next working day is tomorrow (Friday)");
    expect(nextWorkingDayAnswer(dhaka(TUESDAY), [])).toContain("Today (Tuesday) is a working day");
    expect(nextWorkingDayAnswer(dhaka(TUESDAY), [])).toContain("next working day is Friday (in 3 days)");
  });

  it("lists the bus days and upcoming bus-suspending closures", () => {
    const answer = busDaysAnswer(dhaka(WEDNESDAY), [closure("2026-12-16")]);
    expect(answer).toContain("Buses run Friday to Tuesday");
    expect(answer).toContain("no bus service on Wednesday and Thursday");
    expect(answer).toContain("2026-12-16 (Victory Day)");
    expect(answer).toContain("There is no bus service today");
  });
});
