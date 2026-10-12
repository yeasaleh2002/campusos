import { expect, settle, test } from "./fixtures";

test.describe("Contributors page and landing", () => {
  test("footer links to the contributors page, which shows both people with their photos", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await page.getByRole("contentinfo").getByRole("link", { name: "Contributors" }).click();
    await page.waitForURL("**/contributors");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("The people behind CampusOS");

    for (const name of ["Yeasaleh", "Fazle Rabbi"]) {
      const card = page.getByRole("article", { name });
      await expect(card).toBeVisible();
      const photo = card.getByRole("img", { name: `Portrait of ${name}` });
      await expect(photo).toBeVisible();
      await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(100);
      await expect(card.getByRole("link", { name: /@gmail\.com$/ })).toHaveAttribute("href", /^mailto:/);
    }
    // Urgent contact: a WhatsApp link per person (wa.me), and the batch is shown.
    await expect(page.getByRole("link", { name: /WhatsApp .* for urgent contact/ })).toHaveCount(2);
    await expect(page.getByRole("link", { name: /Fazle Rabbi for urgent contact/ })).toHaveAttribute("href", "https://wa.me/8801736208819");
    await expect(page.getByRole("link", { name: /Yeasaleh for urgent contact/ })).toHaveAttribute("href", "https://wa.me/8801735782467");
    await expect(page.getByText("CSE · Batch 62 · Day")).toHaveCount(2);
  });

  test("landing: live sections fill in after load (stats, events, next bus, campus week)", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await expect(page.getByRole("region", { name: "CampusOS in numbers" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Next buses to campus" })).toBeVisible();
    // The next-bus panel works out "today" in the browser; the skeleton rows are replaced by routes or the off-day card.
    await expect(page.getByRole("link", { name: "Full timetable & stop finder" })).toBeVisible();
    await expect(page.getByRole("list", { name: "Campus week, Friday to Thursday" }).getByRole("listitem")).toHaveCount(7);
    await expect(page.locator("[aria-current='date']")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Meet the team" })).toBeVisible();
  });

  test("footer has a centred install button that explains how to install when the browser gives no prompt", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    const button = page.getByRole("contentinfo").getByRole("button", { name: "Install CampusOS app" });
    await expect(button).toBeVisible();
    const [box, viewport] = [await button.boundingBox(), page.viewportSize()];
    expect(Math.abs((box?.x ?? 0) + (box?.width ?? 0) / 2 - (viewport?.width ?? 0) / 2)).toBeLessThan(12);
    await button.click();
    await expect(page.getByRole("dialog", { name: "Install CampusOS" })).toBeVisible();
    await page.getByRole("button", { name: "Got it" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});
