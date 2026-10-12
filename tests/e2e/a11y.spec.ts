import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { BASE_URL, expect, settle, staffTest as test } from "./fixtures";

const PUBLIC_PAGES = ["/", "/events", "/clubs", "/resources", "/bus", "/notices", "/helpdesk", "/lost-found", "/forms", "/contributors", "/search?q=bus", "/login", "/signup", "/forgot-password", "/complaints/track", "/maintenance"];
const ADMIN_PAGES = ["/admin/dashboard", "/admin/events", "/admin/events/new", "/admin/clubs", "/admin/notices", "/admin/forms", "/admin/bus", "/admin/helpdesk", "/admin/academics", "/admin/resources", "/admin/lost-found", "/admin/complaints", "/admin/users", "/admin/audit-log", "/admin/settings"];

/** WCAG 2.1 A/AA rules; serious and critical violations fail the run. */
async function violations(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  return result.violations.filter((violation) => violation.impact === "serious" || violation.impact === "critical").map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.slice(0, 3).map((node) => `${node.target.join(" ")} ${JSON.stringify(node.any[0]?.data ?? {}).slice(0, 160)}`).join(" | ")}`);
}

async function theme(page: Page, value: "light" | "dark") {
  await page.addInitScript((mode) => localStorage.setItem("theme", mode), value);
}

for (const mode of ["light", "dark"] as const) {
  test.describe(`Accessibility (axe, ${mode} mode)`, () => {
    for (const path of PUBLIC_PAGES) {
      test(`public ${path}`, async ({ page }) => {
        await theme(page, mode);
        await page.goto(path);
        await settle(page);
        expect(await violations(page)).toEqual([]);
      });
    }

    for (const path of ADMIN_PAGES) {
      test(`admin ${path}`, async ({ browser, staff }) => {
        const context = await browser.newContext({ baseURL: BASE_URL, storageState: staff[1] });
        const page = await context.newPage();
        await theme(page, mode);
        await page.goto(path);
        await settle(page);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        expect(await violations(page)).toEqual([]);
        await context.close();
      });
    }
  });
}

test.describe("Reduced motion", () => {
  test("animations are disabled and the page stays usable", async ({ browser }) => {
    const context = await browser.newContext({ baseURL: BASE_URL, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/");
    await settle(page);
    const longest = await page.evaluate(() =>
      Math.max(0, ...document.getAnimations().map((animation) => Number(animation.effect?.getComputedTiming().duration ?? 0)).filter((duration) => Number.isFinite(duration) && duration < 100000)),
    );
    expect(longest).toBeLessThanOrEqual(50);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await context.close();
  });
});
