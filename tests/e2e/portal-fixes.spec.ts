import { BASE_URL, expect, settle, staffTest as test } from "./fixtures";

/** Role-aware dashboard links, plain-text notifications and the admin resource preview. */

const ENVELOPE = (data: unknown) => JSON.stringify({ success: true, data, meta: { nextCursor: null, hasMore: false } });

test.describe("Portal fixes", () => {
  test("admin sign-in page offers a way back to the home page", async ({ page }) => {
    await page.goto("/admin/login");
    await settle(page);
    const back = page.getByRole("link", { name: "Back to home page" });
    await expect(back).toBeVisible();
    await expect(back).toHaveAttribute("href", "/");
    await back.click();
    await page.waitForURL(`${BASE_URL}/`);
  });

  test("staff see their own dashboard from the public site, not the student one", async ({ browser, staff }) => {
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: staff[1] });
    const page = await context.newPage();
    await page.goto("/events");
    await settle(page);
    await page.getByRole("button", { name: "Account menu" }).click();
    await expect(page.getByRole("menuitem", { name: "Admin dashboard" })).toHaveAttribute("href", "/admin/dashboard");
    await expect(page.getByRole("menuitem", { name: "My student view" })).toHaveAttribute("href", "/dashboard");
    await page.keyboard.press("Escape");
    await page.getByRole("contentinfo").getByRole("link", { name: "Dashboard" }).click();
    await page.waitForURL("**/admin/dashboard");
    await context.close();
  });

  test("a notification is plain text: its title is not a link and clicking does not navigate", async ({ browser, staff }) => {
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: staff[1] });
    const page = await context.newPage();
    await page.route("**/api/notifications?*", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: ENVELOPE([{ id: "n1", type: "EVENT", title: "Your ticket is ready", body: "See you at the workshop.", link: "/dashboard/registrations", readAt: null, createdAt: new Date().toISOString() }]),
      }),
    );
    await page.goto("/dashboard/notifications");
    await settle(page);
    const title = page.getByText("Your ticket is ready");
    await expect(title).toBeVisible();
    await expect(page.getByRole("link", { name: "Your ticket is ready" })).toHaveCount(0);
    await title.click();
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);
    await context.close();
  });

  test("admin resources: the preview button only exists for a PDF or an image", async ({ browser, staff }) => {
    const base = { description: null, type: "NOTES", status: "PENDING", rejectionReason: null, downloadCount: 0, createdAt: new Date().toISOString(), fileSize: 1000, department: { code: "CSE" }, course: null, uploadedBy: { id: "u", name: "Uploader", email: "u@example.com", studentId: null } };
    const rows = [
      { ...base, id: "r1", title: "Has a PDF", fileUrl: "https://example.com/f/a", mimeType: "application/pdf" },
      { ...base, id: "r2", title: "Has an image", fileUrl: "https://example.com/f/b", mimeType: "image/png" },
      { ...base, id: "r3", title: "No file at all", fileUrl: null, mimeType: null },
    ];
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: staff[1] });
    const page = await context.newPage();
    await page.route("**/api/admin/resources?*", (route) => route.fulfill({ contentType: "application/json", body: ENVELOPE(rows) }));
    await page.goto("/admin/resources");
    await settle(page);
    await expect(page.getByRole("button", { name: "Preview Has a PDF" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview Has an image" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview No file at all" })).toHaveCount(0);
    await page.getByRole("button", { name: "Preview Has an image" }).click();
    await expect(page.getByRole("img", { name: "Preview: Has an image" })).toBeVisible();
    await context.close();
  });
});
