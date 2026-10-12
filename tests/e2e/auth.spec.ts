import { expect, readOtp, settle, test, uniqueAccount } from "./fixtures";

test.describe("Authentication", () => {
  test("signup with OTP verification, then login", async ({ page, context }) => {
    const account = uniqueAccount("signup");

    await page.goto("/signup");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Create your account");
    await settle(page);
    await page.getByLabel("Full name").fill(account.name);
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel(/^Password/).fill(account.password);
    await page.getByRole("button", { name: "Create account" }).click();

    await page.waitForURL("**/verify-email**");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Check your inbox");
    const code = await readOtp(account.email);
    await page.getByLabel("Digit 1").click();
    await page.keyboard.type(code);
    await page.waitForURL("**/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome back");

    // Sign out (cookie), then sign in again through the form.
    await context.clearCookies();
    await page.goto("/login");
    await settle(page);
    await page.getByLabel("Email").fill(account.email);
    await page.getByLabel(/^Password/).fill(account.password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL("**/dashboard");
  });

  test("wrong password shows an inline error", async ({ page }) => {
    await page.goto("/login");
    await settle(page);
    await page.getByLabel("Email").fill("nobody.e2e@example.com");
    await page.getByLabel(/^Password/).fill("WrongPassword1");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.getByText("Email or password is incorrect.")).toBeVisible();
  });

  test("protected pages redirect guests to login with a next parameter", async ({ page }) => {
    await page.goto("/dashboard/registrations");
    await page.waitForURL(/\/login\?next=/);
    expect(decodeURIComponent(new URL(page.url()).searchParams.get("next") ?? "")).toBe("/dashboard/registrations");
  });
});
