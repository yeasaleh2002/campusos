import { apiFrom, BASE_URL, expect, staffTest as test } from "./fixtures";

const HOUR = 60 * 60 * 1000;

/** Dhaka wall-clock instants (2026-10-14 is a Wednesday, 2026-10-16 a Friday). */
const WEDNESDAY_MORNING = new Date("2026-10-14T10:00:00+06:00");
const FRIDAY_EARLY = new Date("2026-10-16T05:00:00+06:00");

test.describe("Campus calendar and bus service rules", () => {
  test("bus page shows the off-day state when the clock is Wednesday (Asia/Dhaka)", async ({ page }) => {
    await page.clock.install({ time: WEDNESDAY_MORNING });
    await page.goto("/bus");
    // With a faked clock the network never reports idle; the assertions below wait for the UI instead.
    await page.waitForLoadState("domcontentloaded");
    const banner = page.getByRole("status").filter({ hasText: "No bus service today" }).first();
    await expect(banner).toBeVisible({ timeout: 30_000 });
    await expect(banner).toContainText("Wednesday is a weekly off day");
    await expect(banner).toContainText("Next service: Friday");
  });

  test("route page: weekday selector marks Wednesday and Thursday as off days and shows the no-service card", async ({ page }) => {
    await page.clock.install({ time: WEDNESDAY_MORNING });
    await page.goto("/bus");
    // With a faked clock the network never reports idle; the assertions below wait for the UI instead.
    await page.waitForLoadState("domcontentloaded");
    const firstRoute = page.locator('a[href^="/bus/"]').first();
    await firstRoute.waitFor({ timeout: 30_000 });
    await firstRoute.click();
    await page.waitForURL(/\/bus\/[A-Za-z0-9-]+$/);

    const timetable = page.getByRole("region", { name: /timetable/i });
    await expect(timetable).toBeVisible({ timeout: 30_000 });
    const wednesday = page.getByRole("radio", { name: /Wednesday, off day, no service, today/ });
    const thursday = page.getByRole("radio", { name: /Thursday, off day, no service/ });
    await expect(wednesday).toBeVisible();
    await expect(thursday).toBeVisible();
    await expect(wednesday).toContainText("Off day");
    await expect(timetable.getByRole("status")).toContainText("No bus service today");

    await thursday.click();
    await expect(timetable.getByRole("status")).toContainText("Thursday is a weekly off day");
    await page.getByRole("radio", { name: /^Saturday/ }).click();
    await expect(timetable.getByRole("status")).toHaveCount(0);
    await expect(timetable.getByRole("listitem").first()).toBeVisible();
  });

  test("on a Friday morning the next-bus finder is live (no off-day card)", async ({ page }) => {
    await page.clock.install({ time: FRIDAY_EARLY });
    await page.goto("/bus");
    // With a faked clock the network never reports idle; the assertions below wait for the UI instead.
    await page.waitForLoadState("domcontentloaded");
    await expect(page.getByRole("region", { name: "Next bus finder" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("No bus service today")).toHaveCount(0);
  });

  test("API: /api/bus/next reports service state and never returns an empty answer", async ({ playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: BASE_URL });
    const routes = (await (await anon.get("/api/bus/routes")).json()) as { data: Array<{ code: string }> };
    const response = await anon.get(`/api/bus/next?route=${routes.data[0].code}&limit=2`);
    expect(response.ok()).toBeTruthy();
    const body = (await response.json()) as { data: { service: boolean; reason: string | null; message: string; nextServiceAt: string | null; departures: unknown[] } };
    expect(typeof body.data.service).toBe("boolean");
    expect(body.data.message.length).toBeGreaterThan(5);
    expect(body.data.departures.length).toBeGreaterThan(0);
    if (!body.data.service) {
      expect(body.data.reason).toMatch(/OFF_DAY|CLOSURE/);
      expect(body.data.nextServiceAt).not.toBeNull();
    }
    const calendar = (await (await anon.get("/api/calendar")).json()) as { data: { weeklyRule: { workingDays: string[]; offDays: string[] }; timeZone: string } };
    expect(calendar.data.timeZone).toBe("Asia/Dhaka");
    expect(calendar.data.weeklyRule.offDays).toEqual(["Wednesday", "Thursday"]);
    expect(calendar.data.weeklyRule.workingDays).toEqual(["Friday", "Saturday", "Sunday", "Monday", "Tuesday"]);
    await anon.dispose();
  });

  test("admin: a bus trip on Wednesday or Thursday is rejected with BUS_DAY_NOT_ALLOWED", async ({ playwright, staff }) => {
    const admin = await apiFrom(playwright, staff[1]);
    const routes = (await (await admin.get("/api/admin/bus/routes")).json()) as { data: Array<{ id: string }> };
    for (const days of [[3], [4], [5, 3]]) {
      const response = await admin.post(`/api/admin/bus/routes/${routes.data[0].id}/trips`, { data: { departureTime: "09:00", direction: "TO_CAMPUS", daysOfWeek: days, isActive: true } });
      expect(response.status()).toBe(422);
      expect(((await response.json()) as { error: { code: string } }).error.code).toBe("BUS_DAY_NOT_ALLOWED");
    }
    await admin.dispose();
  });

  test("admin: closures are created, show up in the public calendar, and can be deleted", async ({ playwright, staff }) => {
    const admin = await apiFrom(playwright, staff[1]);
    const anon = await playwright.request.newContext({ baseURL: BASE_URL });
    // Inside the 400-day window the public calendar serves; far-future dates are intentionally not listed.
    const date = new Date(Date.now() + (200 * 24 + 6) * HOUR).toISOString().slice(0, 10);
    const created = await admin.post("/api/admin/calendar/closures", { data: { date, title: "E2E exam-day bus change", closesCampus: false, suspendsBus: true, note: "e2e" } });
    expect(created.status(), await created.text()).toBe(201);
    const id = ((await created.json()) as { data: { id: string } }).data.id;
    try {
      expect((await admin.post("/api/admin/calendar/closures", { data: { date, title: "Duplicate day", closesCampus: true, suspendsBus: true } })).status()).toBe(409);
      expect((await admin.post("/api/admin/calendar/closures", { data: { date: new Date(Date.now() + (201 * 24 + 6) * HOUR).toISOString().slice(0, 10), title: "No effect", closesCampus: false, suspendsBus: false } })).status()).toBe(400);
      expect((await admin.patch(`/api/admin/calendar/closures/${id}`, { data: { closesCampus: true } })).ok()).toBeTruthy();
      const calendar = (await (await anon.get("/api/calendar")).json()) as { data: { closures: Array<{ dateKey: string; closesCampus: boolean }> } };
      expect(calendar.data.closures).toContainEqual(expect.objectContaining({ dateKey: date, closesCampus: true }));
    } finally {
      expect((await admin.delete(`/api/admin/calendar/closures/${id}`)).ok()).toBeTruthy();
    }
    const after = (await (await anon.get("/api/calendar")).json()) as { data: { closures: Array<{ dateKey: string }> } };
    expect(after.data.closures.some((closure) => closure.dateKey === date)).toBe(false);
    await admin.dispose();
    await anon.dispose();
  });

  test("admin: an event on a weekly off day needs confirmOffDay", async ({ playwright, staff }) => {
    const admin = await apiFrom(playwright, staff[1]);
    const clubs = (await (await admin.get("/api/admin/clubs?limit=1")).json()) as { data: Array<{ id: string }> };
    // Find the next Wednesday (Dhaka) at least 3 days ahead.
    let start = Date.now() + 3 * 24 * HOUR;
    while (new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Dhaka", weekday: "long" }).format(start) !== "Wednesday") start += 24 * HOUR;
    const payload = {
      title: `E2E off-day ${Date.now().toString(36)}`,
      description: "Off-day confirmation check for the e2e suite.",
      clubId: clubs.data[0].id,
      type: "WORKSHOP",
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + 2 * HOUR).toISOString(),
      venue: "Room OFF",
      bannerUrl: null,
      capacity: null,
      registrationDeadline: null,
      publish: false,
    };
    const rejected = await admin.post("/api/admin/events", { data: payload });
    expect(rejected.status()).toBe(422);
    expect(((await rejected.json()) as { error: { code: string } }).error.code).toBe("OFF_DAY_CONFIRMATION_REQUIRED");

    const accepted = await admin.post("/api/admin/events", { data: { ...payload, confirmOffDay: true } });
    expect(accepted.status(), await accepted.text()).toBe(201);
    const id = ((await accepted.json()) as { data: { id: string } }).data.id;
    await admin.delete(`/api/admin/events/${id}`);
    await admin.dispose();
  });
});
