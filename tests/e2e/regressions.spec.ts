import { expect, settle, test } from "./fixtures";

/** End-to-end regressions for the four bugs reported before submission (CHANGELOG 0.9.0). */

test.describe("Regressions", () => {
  test("login goes straight to the dashboard and never shows the maintenance page", async ({ page, session }) => {
    await page.goto("/login");
    await settle(page);
    await page.getByLabel("Email").fill(session.account.email);
    await page.getByLabel(/^Password/).fill(session.account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");
    await expect(page.getByText("We will be right back")).toHaveCount(0);
    await expect(page.getByText(/under maintenance/i)).toHaveCount(0);
  });

  test("add to calendar: Google Calendar opens in a new tab and keeps the event page open", async ({ authedPage: page, playwright }) => {
    const api = await playwright.request.newContext({ baseURL: "http://localhost:3100" });
    const events = (await (await api.get("/api/events?limit=1")).json()) as { data: Array<{ slug: string }> };
    await api.dispose();
    await page.goto(`/events/${events.data[0].slug}`);
    await settle(page);
    await page.getByRole("button", { name: "Add to calendar" }).click();
    const link = page.getByRole("menuitem", { name: "Google Calendar" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("href", /^https:\/\/calendar\.google\.com\//);
  });

  test("resource upload offers a custom course when the course is not listed", async ({ authedPage: page }) => {
    await page.goto("/dashboard/resources/upload");
    await settle(page);
    await expect(page.getByText("Choose a department first.")).toBeVisible();
    await page.getByRole("button", { name: "My course is not listed" }).click();
    const custom = page.getByPlaceholder("Course code and title");
    await expect(custom).toBeVisible();
    await custom.fill("Advanced Robotics");
    await expect(page.getByText("Choose a department first.")).toHaveCount(0);
    await page.getByRole("button", { name: "Pick from the course list instead" }).click();
    await expect(page.getByText("Choose a department first.")).toBeVisible();
  });

  test("lost and found: marking an item returned updates the page without a reload", async ({ authedPage: page }) => {
    const title = `E2E status refresh ${Date.now().toString(36)}`;
    await page.goto("/lost-found/new");
    await settle(page);
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("Grey water bottle with a sticker, left in the cafeteria.");
    await page.getByLabel("Category").selectOption("ACCESSORIES");
    await page.getByLabel("Where?").fill("Cafeteria");
    await page.getByLabel("When?").fill("2026-10-01T12:00");
    await page.getByRole("button", { name: "Post item" }).click();
    await page.waitForURL(/\/lost-found\/[a-z0-9]+$/);

    // A full page load would wipe this marker; a client-side refresh keeps it.
    await page.evaluate(() => {
      (window as unknown as { __noReload: boolean }).__noReload = true;
    });
    await page.getByRole("button", { name: "Mark as returned" }).click();
    await expect(page.getByRole("button", { name: "Mark as returned" })).toHaveCount(0);
    await expect(page.getByText("Resolved", { exact: true }).first()).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete post" }).click();
    await page.waitForURL("**/lost-found");
  });
});
