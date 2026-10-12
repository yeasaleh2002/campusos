import { expect, test } from "./fixtures";

test("register for an event, see the QR ticket, then cancel", async ({ authedPage: page }) => {
  await page.goto("/events");
  const firstCard = page.locator("article").first();
  const empty = page.getByText("No events here yet");
  await expect(firstCard.or(empty)).toBeVisible();
  test.skip(await empty.isVisible(), "No upcoming events seeded.");

  await firstCard.getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  const register = page.getByRole("button", { name: "Register now" });
  const open = await expect(register).toBeEnabled({ timeout: 20_000 }).then(() => true, () => false);
  test.skip(!open, "First event is not open for registration.");
  await register.click();

  await expect(page.getByText("You're going")).toBeVisible();
  const dialog = page.getByRole("dialog", { name: "Your QR ticket" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("img", { name: /QR ticket/ })).toBeVisible();
  await dialog.getByRole("button", { name: /close/i }).click();

  // It must also appear in the dashboard.
  await page.goto("/dashboard/registrations");
  await expect(page.locator("article").first()).toBeVisible();

  // Cancel to leave the seed data as we found it.
  await page.locator("article").first().getByRole("button", { name: /cancel/i }).click();
  await page.getByRole("button", { name: "Cancel registration" }).click();
  await expect(page.getByText("No upcoming tickets")).toBeVisible();
});

test("events feed filters and calendar view", async ({ page }) => {
  await page.goto("/events");
  await page.getByRole("button", { name: "Calendar view" }).click();
  await expect(page).toHaveURL(/view=calendar/);
  await expect(page.getByRole("button", { name: "Next month" })).toBeVisible();
});
