import { apiFrom, BASE_URL, createStudent, expect, readOtp, settle, staffTest as test, uniqueAccount } from "./fixtures";

const HOUR = 60 * 60 * 1000;

test.describe("Edge cases", () => {
  test("wrong verification code is rejected with a clear message and the account stays unverified", async ({ page, playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: BASE_URL });
    const account = uniqueAccount("otp");
    const token = (await (await anon.get("/api/security/form-token")).json()) as { data: { formToken: string; minAgeSeconds: number } };
    await new Promise((resolve) => setTimeout(resolve, (token.data.minAgeSeconds + 0.3) * 1000));
    const signup = await anon.post("/api/auth/signup", { headers: { origin: BASE_URL }, data: { ...account, website: "", formToken: token.data.formToken } });
    expect(signup.ok()).toBeTruthy();
    await readOtp(account.email);

    await page.goto(`/verify-email?email=${encodeURIComponent(account.email)}`);
    await settle(page);
    await page.getByLabel("Digit 1").click();
    await page.keyboard.type("000000");
    await expect(page.getByRole("alert").first()).toBeVisible();
    await expect(page).toHaveURL(/verify-email/);

    const login = await anon.post("/api/auth/login", { headers: { origin: BASE_URL }, data: { email: account.email, password: account.password, website: "" } });
    expect(login.status()).toBe(403);
    await anon.dispose();
  });

  test("unverified accounts cannot sign in", async ({ playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: BASE_URL });
    const account = uniqueAccount("unverified");
    const token = (await (await anon.get("/api/security/form-token")).json()) as { data: { formToken: string; minAgeSeconds: number } };
    await new Promise((resolve) => setTimeout(resolve, (token.data.minAgeSeconds + 0.3) * 1000));
    await anon.post("/api/auth/signup", { headers: { origin: BASE_URL }, data: { ...account, website: "", formToken: token.data.formToken } });
    const login = await anon.post("/api/auth/login", { headers: { origin: BASE_URL }, data: { email: account.email, password: account.password, website: "" } });
    expect(login.status()).toBe(403);
    await anon.dispose();
  });

  test("tampered or garbage session cookie is treated as signed out", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: BASE_URL });
    await context.addCookies([{ name: "campusos_session", value: "not.a.jwt", url: BASE_URL }]);
    const page = await context.newPage();
    await page.goto("/dashboard");
    await page.waitForURL(/\/login/);
    expect((await context.request.get("/api/auth/me")).status()).toBe(401);
    await context.close();
  });

  test("HTTP 429 shows the wait time instead of a generic error", async ({ page }) => {
    await page.route("**/api/auth/login", (route) =>
      route.fulfill({ status: 429, headers: { "content-type": "application/json", "retry-after": "120" }, body: JSON.stringify({ success: false, error: { code: "RATE_LIMITED", message: "Too many attempts." } }) }),
    );
    await page.goto("/login");
    await settle(page);
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByLabel(/^Password/).fill("Whatever123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText(/Try again in 2 min/)).toBeVisible();
  });

  test("offline: a submit explains the connection problem and recovers when back online", async ({ page, context }) => {
    await page.goto("/login");
    await settle(page);
    await context.setOffline(true);
    await page.getByLabel("Email").fill("someone@example.com");
    await page.getByLabel(/^Password/).fill("Whatever123");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText(/offline|connection/i).first()).toBeVisible();
    await context.setOffline(false);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  });

  test("uploads: oversized and wrong-type files are refused", async ({ playwright }) => {
    const student = await createStudent(playwright, "upload");
    const api = await apiFrom(playwright, student.state);
    const big = await api.post("/api/upload/image", { multipart: { purpose: "general", file: { name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(6 * 1024 * 1024, 1) } } });
    expect(big.status()).toBe(413);
    const text = await api.post("/api/upload/image", { multipart: { purpose: "general", file: { name: "note.png", mimeType: "image/png", buffer: Buffer.from("this is not an image at all, just text") } } });
    expect([400, 415, 422]).toContain(text.status());
    const wrongPurpose = await api.post("/api/upload/image", { multipart: { purpose: "../../etc", file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from([137, 80, 78, 71]) } } });
    expect([400, 422]).toContain(wrongPurpose.status());
    await api.dispose();
  });

  test("IDOR: one student cannot read or change another student's data", async ({ playwright, staff }) => {
    const admin = await apiFrom(playwright, staff[1]);
    const [owner, other] = await Promise.all([createStudent(playwright, "owner"), createStudent(playwright, "other")]);
    const [ownerApi, otherApi] = await Promise.all([apiFrom(playwright, owner.state), apiFrom(playwright, other.state)]);
    const clubs = (await (await admin.get("/api/admin/clubs?limit=1")).json()) as { data: Array<{ id: string }> };
    const start = Date.now() + 48 * HOUR;
    const created = await admin.post("/api/admin/events", {
      data: { title: `E2E idor ${Date.now().toString(36)}`, description: "IDOR check event for the e2e suite.", clubId: clubs.data[0].id, type: "WORKSHOP", startAt: new Date(start).toISOString(), endAt: new Date(start + 2 * HOUR).toISOString(), venue: "Room IDOR", bannerUrl: null, capacity: null, registrationDeadline: null, publish: true },
    });
    const eventId = ((await created.json()) as { data: { id: string } }).data.id;
    try {
      const reg = (await (await ownerApi.post(`/api/events/${eventId}/register`, { data: {} })).json()) as { data: { registration: { id: string } } };
      const registrationId = reg.data.registration.id;
      expect((await ownerApi.get(`/api/me/registrations/${registrationId}/qr`)).ok()).toBeTruthy();
      expect([403, 404]).toContain((await otherApi.get(`/api/me/registrations/${registrationId}/qr`)).status());

      const complaint = await ownerApi.post("/api/complaints", { data: { category: "OTHER", subject: "IDOR test complaint", description: "A private complaint that no other student may read.", attachmentUrls: [], isAnonymous: false } });
      const ticket = ((await complaint.json()) as { data: { complaint: { ticketNo: string } } }).data.complaint.ticketNo;
      expect((await ownerApi.get(`/api/complaints/track/${ticket}`)).ok()).toBeTruthy();
      expect((await otherApi.get(`/api/complaints/track/${ticket}`)).status()).toBe(404);

      const notifications = (await (await ownerApi.get("/api/notifications?limit=5")).json()) as { data: Array<{ id: string }> };
      if (notifications.data[0]) expect([403, 404]).toContain((await otherApi.patch(`/api/notifications/${notifications.data[0].id}/read`, { data: {} })).status());
      expect((await otherApi.get("/api/admin/stats")).status()).toBe(403);
    } finally {
      await admin.post(`/api/admin/events/${eventId}/cancel`, { data: { reason: "E2E cleanup" } });
      await admin.delete(`/api/admin/events/${eventId}`);
      await Promise.all([ownerApi.dispose(), otherApi.dispose(), admin.dispose()]);
    }
  });

  test("lost & found: a second claim by the same student is refused", async ({ playwright }) => {
    const [reporter, claimer] = await Promise.all([createStudent(playwright, "reporter"), createStudent(playwright, "claimer")]);
    const [reporterApi, claimerApi] = await Promise.all([apiFrom(playwright, reporter.state), apiFrom(playwright, claimer.state)]);
    const item = await reporterApi.post("/api/lost-found", {
      data: { type: "FOUND", title: "E2E black wallet", description: "Found near the library entrance, e2e fixture.", category: "WALLET", locationText: "Library entrance", occurredAt: new Date(Date.now() - HOUR).toISOString(), imageUrls: [], contactVisible: false },
    });
    expect(item.status(), await item.text()).toBe(201);
    const id = ((await item.json()) as { data: { id: string } }).data.id;
    try {
      const first = await claimerApi.post(`/api/lost-found/${id}/claim`, { data: { message: "This is my wallet, it has my CU student card." } });
      expect(first.status()).toBe(201);
      const second = await claimerApi.post(`/api/lost-found/${id}/claim`, { data: { message: "Claiming it again, same message again." } });
      expect(second.status()).toBe(409);
      const own = await reporterApi.post(`/api/lost-found/${id}/claim`, { data: { message: "Claiming my own post should not work." } });
      expect([403, 409]).toContain(own.status());
    } finally {
      await reporterApi.delete(`/api/lost-found/${id}`, { data: {} });
      await Promise.all([reporterApi.dispose(), claimerApi.dispose()]);
    }
  });

  test("deleted or unknown resource links show a friendly not-found page and a clean 404 from the API", async ({ page, playwright }) => {
    const anon = await playwright.request.newContext({ baseURL: BASE_URL });
    expect((await anon.get("/api/resources/ckxxxxxxxxxxxxxxxxxxxxxxx")).status()).toBe(404);
    await anon.dispose();
    // The page streams, so the HTTP status is already 200 when notFound() fires; the visible
    // not-found UI and the noindex robots tag are what users and crawlers get (documented limit).
    await page.goto("/resources/ckxxxxxxxxxxxxxxxxxxxxxxx");
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/different bus|not found/i, { timeout: 30_000 });
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  });
});
