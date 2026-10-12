import type { APIRequestContext } from "@playwright/test";
import { apiFrom, BASE_URL, createStudent, expect, settle, STAFF_ROLE, staffTest as test } from "./fixtures";

interface EventPayload {
  title: string;
  capacity: number | null;
  startsInMinutes: number;
  publish: boolean;
}

const HOUR = 60 * 60 * 1000;

async function firstClubId(api: APIRequestContext): Promise<string> {
  const response = await api.get("/api/admin/clubs?limit=1");
  expect(response.ok()).toBeTruthy();
  const { data } = (await response.json()) as { data: Array<{ id: string }> };
  return data[0].id;
}

/** Creates (and optionally publishes) an event through the admin API. */
async function makeEvent(api: APIRequestContext, over: Partial<EventPayload> = {}): Promise<{ id: string; title: string }> {
  const title = over.title ?? `E2E event ${Date.now().toString(36)}`;
  const start = Date.now() + (over.startsInMinutes ?? 24 * 60) * 60_000;
  const response = await api.post("/api/admin/events", {
    data: {
      title,
      description: "Created by the automated end-to-end suite. Safe to delete.",
      clubId: await firstClubId(api),
      type: "WORKSHOP",
      startAt: new Date(start).toISOString(),
      endAt: new Date(start + 2 * HOUR).toISOString(),
      venue: "Room E2E",
      bannerUrl: null,
      capacity: over.capacity === undefined ? null : over.capacity,
      registrationDeadline: null,
      publish: over.publish ?? true,
      // These tests are about registration and check-in, not the calendar: the event may land on a Wednesday or Thursday.
      confirmOffDay: true,
    },
  });
  expect(response.status(), await response.text()).toBe(201);
  const { data } = (await response.json()) as { data: { id: string } };
  return { id: data.id, title };
}

async function cleanup(api: APIRequestContext, eventId: string): Promise<void> {
  await api.post(`/api/admin/events/${eventId}/cancel`, { data: { reason: "E2E cleanup" } });
  await api.delete(`/api/admin/events/${eventId}`);
}

test.describe("Admin portal: roles", () => {
  const expectations = [
    { slot: 3 as const, visible: ["Dashboard", "Events", "Clubs", "Forms"], hidden: ["Users", "Notices", "Resources", "Settings", "Audit log"], forbidden: "/admin/users", api: "/api/admin/users" },
    { slot: 4 as const, visible: ["Dashboard", "Resources", "Lost & found", "Complaints", "Helpdesk & chatbot"], hidden: ["Events", "Users", "Settings", "Bus"], forbidden: "/admin/events", api: "/api/admin/events" },
    { slot: 2 as const, visible: ["Dashboard", "Events", "Users", "Settings", "Audit log"], hidden: [], forbidden: null, api: null },
  ];

  for (const row of expectations) {
    test(`${STAFF_ROLE[row.slot]}: menu, blocked route and API are consistent`, async ({ browser, playwright, staff }) => {
      const context = await browser.newContext({ baseURL: BASE_URL, storageState: staff[row.slot] });
      const page = await context.newPage();
      await page.goto("/admin/dashboard");
      const nav = page.getByRole("navigation", { name: "Admin sections" });
      for (const label of row.visible) await expect(nav.getByRole("link", { name: label, exact: true })).toBeVisible();
      for (const label of row.hidden) await expect(nav.getByRole("link", { name: label, exact: true })).toHaveCount(0);

      if (row.forbidden && row.api) {
        await page.goto(row.forbidden);
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("You do not have access to this section");
        const api = await apiFrom(playwright, staff[row.slot]);
        expect((await api.get(row.api)).status()).toBe(403);
        await api.dispose();
      }
      await context.close();
    });
  }

  test("a student can neither open the console nor call its API", async ({ browser, playwright }) => {
    const student = await createStudent(playwright, "denied");
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: student.state });
    const page = await context.newPage();
    await page.goto("/admin/dashboard");
    await page.waitForURL(/\/admin\/login/);
    const api = await apiFrom(playwright, student.state);
    expect((await api.get("/api/admin/stats")).status()).toBe(403);
    expect((await api.get("/api/admin/audit-logs")).status()).toBe(403);
    await api.dispose();
    await context.close();
  });

  test("anonymous requests to the admin API get 401", async ({ playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: BASE_URL });
    for (const path of ["/api/admin/stats", "/api/admin/users", "/api/admin/events"]) expect((await anon.get(path)).status()).toBe(401);
    await anon.dispose();
  });
});

test.describe("Admin portal: content reaches the public site", () => {
  test("event lifecycle: draft → publish → public list → cancel → gone", async ({ browser, staff, playwright }) => {
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: staff[1] });
    const page = await context.newPage();
    const title = `E2E lifecycle ${Date.now().toString(36)}`;

    await page.goto("/admin/events/new");
    await settle(page);
    await page.getByLabel(/^Title/).fill(title);
    await page.getByLabel(/^Description/).fill("End-to-end lifecycle check for the admin portal.");
    await page.getByLabel(/^Club/).selectOption({ index: 1 });
    const start = new Date(Date.now() + 48 * HOUR);
    const local = (date: Date) => new Date(date.getTime() + 6 * HOUR).toISOString().slice(0, 16);
    await page.getByLabel(/^Starts/).fill(local(start));
    await page.getByLabel(/^Ends/).fill(local(new Date(start.getTime() + 2 * HOUR)));
    await page.getByLabel(/^Venue/).fill("Room E2E");
    await page.getByRole("button", { name: "Create event" }).click();
    await page.waitForURL("**/admin/events");

    // Draft: not on the public list yet.
    const row = page.getByRole("row", { name: new RegExp(title) });
    await expect(row.getByText("Draft")).toBeVisible();
    const anon = await playwright.request.newContext({ baseURL: BASE_URL });
    const listed = async () => ((await (await anon.get("/api/events?when=upcoming&limit=50")).json()) as { data: Array<{ title: string }> }).data.some((event) => event.title === title);
    expect(await listed()).toBe(false);

    // Publish from the table: the public API reflects it on the next request.
    await row.getByRole("button", { name: `Publish ${title}` }).click();
    await expect(row.getByText("Open")).toBeVisible();
    await expect.poll(listed, { timeout: 15_000 }).toBe(true);

    // Cancel with a reason: gone from the public list again.
    await row.getByRole("button", { name: `Cancel ${title}` }).click();
    await page.getByLabel(/^Reason/).fill("E2E: testing cancellation");
    await page.getByRole("button", { name: "Cancel event" }).click();
    await expect(row.getByText("Cancelled")).toBeVisible();
    await expect.poll(listed, { timeout: 15_000 }).toBe(false);

    // Clean up.
    await row.getByRole("button", { name: `Delete ${title}` }).click();
    await page.getByRole("button", { name: "Delete event" }).click();
    await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
    await anon.dispose();
    await context.close();
  });

  test("notice: posted by an admin shows on /notices, deleted notice disappears", async ({ browser, staff }) => {
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: staff[1] });
    const page = await context.newPage();
    const title = `E2E notice ${Date.now().toString(36)}`;
    await page.goto("/admin/notices");
    await settle(page);
    await page.getByRole("button", { name: "New notice" }).click();
    await page.getByLabel(/^Title/).fill(title);
    await page.getByLabel(/^Message/).fill("Automated notice used to verify instant public updates.");
    await page.getByRole("button", { name: "Post notice" }).click();
    await expect(page.getByRole("row", { name: new RegExp(title) })).toBeVisible();

    const visitor = await browser.newContext({ baseURL: BASE_URL });
    const publicPage = await visitor.newPage();
    await publicPage.goto("/notices");
    await expect(publicPage.getByText(title).first()).toBeVisible();

    await page.getByRole("button", { name: `Delete ${title}` }).click();
    await page.getByRole("button", { name: "Delete notice" }).click();
    await expect(page.getByRole("row", { name: new RegExp(title) })).toHaveCount(0);
    await publicPage.reload();
    await expect(publicPage.getByText(title)).toHaveCount(0);
    await visitor.close();
    await context.close();
  });

  test("site banner shows on public pages, maintenance mode blocks visitors but not staff", async ({ browser, staff, playwright }) => {
    // This flips the REAL maintenance flag, which takes the public site down for everyone on the
    // same database. Run it only against a throwaway database (E2E_ALLOW_MAINTENANCE_TOGGLE=1).
    test.skip(process.env.E2E_ALLOW_MAINTENANCE_TOGGLE !== "1", "Toggles the shared maintenance flag; opt in with E2E_ALLOW_MAINTENANCE_TOGGLE=1.");
    const admin = await apiFrom(playwright, staff[1]);
    const message = `E2E banner ${Date.now().toString(36)}`;
    try {
      expect((await admin.patch("/api/admin/settings", { data: { bannerMessage: message, bannerTone: "warning" } })).ok()).toBeTruthy();
      const visitor = await browser.newContext({ baseURL: BASE_URL });
      const page = await visitor.newPage();
      await page.goto("/events");
      await expect(page.getByRole("status").filter({ hasText: message })).toBeVisible();

      expect((await admin.patch("/api/admin/settings", { data: { bannerMessage: null, maintenanceMode: true, maintenanceMessage: "E2E maintenance window" } })).ok()).toBeTruthy();
      // Visitors get a full-screen cover; reading the API still works, writes are refused, health stays up.
      await expect(async () => {
        await page.reload();
        await expect(page.getByRole("alertdialog").getByText("E2E maintenance window")).toBeVisible({ timeout: 4_000 });
      }).toPass({ timeout: 40_000, intervals: [1_000] });
      expect((await page.request.get("/api/events")).status()).toBe(200);
      expect((await page.request.post("/api/complaints", { data: {}, headers: { origin: BASE_URL } })).status()).toBe(503);
      expect((await page.request.get("/api/health")).status()).toBe(200);

      // Staff are not affected.
      const staffContext = await browser.newContext({ baseURL: BASE_URL, storageState: staff[1] });
      const staffPage = await staffContext.newPage();
      await staffPage.goto("/events");
      await expect(staffPage.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(staffPage.getByRole("alertdialog")).toHaveCount(0);
      await staffContext.close();
      await visitor.close();
    } finally {
      await admin.patch("/api/admin/settings", { data: { bannerMessage: null, maintenanceMode: false, maintenanceMessage: null } });
      await admin.dispose();
    }
    const after = await browser.newContext({ baseURL: BASE_URL });
    const afterPage = await after.newPage();
    await afterPage.goto("/events");
    await expect(afterPage.getByRole("alertdialog")).toHaveCount(0);
    await after.close();
  });
});

test.describe("Admin portal: check-in and concurrency", () => {
  test("find attendee → check in → duplicate is rejected → counters update", async ({ browser, playwright, staff }) => {
    test.setTimeout(240_000);
    const admin = await apiFrom(playwright, staff[1]);
    const student = await createStudent(playwright, "checkin");
    const event = await makeEvent(admin, { startsInMinutes: 60 });
    const studentApi = await apiFrom(playwright, student.state);
    try {
      const registered = await studentApi.post(`/api/events/${event.id}/register`, { data: {} });
      expect(registered.status(), await registered.text()).toBe(201);
      const registrationId = ((await registered.json()) as { data: { registration: { id: string } } }).data.registration.id;

      const context = await browser.newContext({ baseURL: BASE_URL, storageState: staff[1] });
      const page = await context.newPage();
      await page.goto(`/admin/events/${event.id}/checkin`);
      await page.getByRole("tab", { name: "Find attendee" }).click({ timeout: 60_000 });
      await page.getByLabel(/^Search by name/).fill(student.account.name.slice(0, 10));
      await page.getByRole("button", { name: "Check in" }).first().click();
      await expect(page.getByRole("status").filter({ hasText: student.account.name }).first()).toBeVisible();
      await expect(page.getByLabel("Live counters")).toContainText("/ 1", { timeout: 20_000 });

      // Second attempt (another scanner / double tap): 409 ALREADY_CHECKED_IN.
      const again = await admin.post(`/api/admin/events/${event.id}/registrations/${registrationId}/checkin`, { data: {} });
      expect(again.status()).toBe(409);
      expect(((await again.json()) as { error: { code: string } }).error.code).toBe("ALREADY_CHECKED_IN");
      await context.close();
    } finally {
      await studentApi.dispose();
      await cleanup(admin, event.id);
      await admin.dispose();
    }
  });

  test("capacity 1: two simultaneous registrations → exactly one wins", async ({ playwright, staff }) => {
    const admin = await apiFrom(playwright, staff[1]);
    const [one, two] = await Promise.all([createStudent(playwright, "race1"), createStudent(playwright, "race2")]);
    const event = await makeEvent(admin, { capacity: 1, startsInMinutes: 24 * 60 });
    const [apiOne, apiTwo] = await Promise.all([apiFrom(playwright, one.state), apiFrom(playwright, two.state)]);
    try {
      const results = await Promise.all([apiOne.post(`/api/events/${event.id}/register`, { data: {} }), apiTwo.post(`/api/events/${event.id}/register`, { data: {} })]);
      const statuses = results.map((response) => response.status()).sort();
      expect(statuses).toEqual([201, 409]);
      const detail = (await (await admin.get(`/api/admin/events/${event.id}`)).json()) as { data: { registrationCount: number } };
      expect(detail.data.registrationCount).toBe(1);

      // Re-sending the winner's request is idempotent (no second registration, no 500).
      const winner = results[0].status() === 201 ? apiOne : apiTwo;
      expect([200, 201, 409]).toContain((await winner.post(`/api/events/${event.id}/register`, { data: {} })).status());
      expect(((await (await admin.get(`/api/admin/events/${event.id}`)).json()) as { data: { registrationCount: number } }).data.registrationCount).toBe(1);
    } finally {
      await Promise.all([apiOne.dispose(), apiTwo.dispose()]);
      await cleanup(admin, event.id);
      await admin.dispose();
    }
  });

  test("deactivated user with a live session is locked out immediately, and can return when reactivated", async ({ playwright, staff }) => {
    const admin = await apiFrom(playwright, staff[1]);
    const student = await createStudent(playwright, "deactivate");
    const studentApi = await apiFrom(playwright, student.state);
    try {
      const me = (await (await studentApi.get("/api/auth/me")).json()) as { data: { user: { id: string } } };
      expect((await studentApi.get("/api/me/registrations")).ok()).toBeTruthy();

      const off = await admin.patch(`/api/admin/users/${me.data.user.id}`, { data: { isActive: false } });
      expect(off.status(), await off.text()).toBe(200);
      expect((await studentApi.get("/api/me/registrations")).status()).toBe(401);
      expect((await studentApi.get("/api/auth/me")).status()).toBe(401);

      expect((await admin.patch(`/api/admin/users/${me.data.user.id}`, { data: { isActive: true } })).ok()).toBeTruthy();
      // The old token was revoked (tokenVersion bumped), so signing in again is required.
      expect((await studentApi.get("/api/auth/me")).status()).toBe(401);
      const login = await studentApi.post("/api/auth/login", { data: { email: student.account.email, password: student.account.password, website: "" } });
      expect(login.ok()).toBeTruthy();
    } finally {
      await studentApi.dispose();
      await admin.dispose();
    }
  });

  test("club admin can only touch events of their own club", async ({ playwright, staff }) => {
    const superApi = await apiFrom(playwright, staff[1]);
    const clubApi = await apiFrom(playwright, staff[3]);
    try {
      const mine = ((await (await clubApi.get("/api/admin/clubs?limit=50")).json()) as { data: Array<{ id: string }> }).data;
      const all = ((await (await superApi.get("/api/admin/clubs?limit=50")).json()) as { data: Array<{ id: string }> }).data;
      expect(mine.length).toBeGreaterThan(0);
      const foreign = all.find((club) => !mine.some((own) => own.id === club.id));
      test.skip(!foreign, "Only one club exists.");
      const response = await clubApi.post("/api/admin/events", {
        data: { title: "Not my club", description: "Should be refused for this role.", clubId: foreign?.id, type: "WORKSHOP", startAt: new Date(Date.now() + 48 * HOUR).toISOString(), endAt: new Date(Date.now() + 50 * HOUR).toISOString(), venue: "x room", bannerUrl: null, capacity: null, registrationDeadline: null, publish: false },
      });
      expect(response.status()).toBe(403);
    } finally {
      await superApi.dispose();
      await clubApi.dispose();
    }
  });
});
