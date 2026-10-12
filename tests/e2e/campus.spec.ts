import { expect, settle, test } from "./fixtures";

test.describe("Resources", () => {
  test("search finds course material and the previous-questions shortcut filters", async ({ page }) => {
    await page.goto("/resources");
    await settle(page);
    await page.getByRole("searchbox", { name: "Search resources" }).fill("dbms");
    await expect(page).toHaveURL(/q=dbms/);
    const first = page.locator("article").first();
    await expect(first.or(page.getByText(/Nothing found/))).toBeVisible();

    await page.getByRole("radio", { name: "Previous questions" }).click();
    await expect(page).toHaveURL(/type=QUESTION_PAPER/);
  });

  // The PDF goes browser -> UploadThing -> callback to this app. UploadThing cannot call back to localhost,
  // so the full upload is exercised manually / on a deployed preview (see docs/TESTING.md).
  test("upload form validates before submitting", async ({ authedPage: page }) => {
    await page.goto("/dashboard/resources/upload");
    await settle(page);
    await page.getByRole("button", { name: "Submit for review" }).click();
    await expect(page.getByText("Give it a descriptive title (5+ characters).")).toBeVisible();
    await expect(page.getByText("Choose a department.")).toBeVisible();
  });
});

test.describe("Lost & found", () => {
  test("post a lost item and open its page", async ({ authedPage: page }) => {
    const title = `E2E lost umbrella ${Date.now().toString(36)}`;
    await page.goto("/lost-found/new");
    await settle(page);
    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("Blue folding umbrella with a wooden handle, left near the library.");
    await page.getByLabel("Category").selectOption("ACCESSORIES");
    await page.getByLabel("Where?").fill("Library entrance");
    await page.getByLabel("When?").fill("2026-10-01T10:30");
    await page.getByRole("button", { name: "Post item" }).click();

    await page.waitForURL(/\/lost-found\/[a-z0-9]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    // The reporter sees management tools, not the claim form.
    await expect(page.getByRole("button", { name: "Mark as returned" })).toBeVisible();
    await page.getByRole("button", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete post" }).click();
    await page.waitForURL("**/lost-found");
  });
});

test.describe("Complaints", () => {
  test("file a complaint and track it by ticket number", async ({ authedPage: page }) => {
    await page.goto("/complaints/new");
    await settle(page);
    await page.getByLabel("Category").selectOption("TRANSPORT");
    await page.getByLabel("Subject").fill("E2E: bus left earlier than the timetable");
    await page.getByLabel("What happened?").fill("The 08:30 bus left the first stop at 08:15 today, so many students missed it.");
    await page.getByRole("button", { name: "Submit complaint" }).click();

    await expect(page.getByRole("heading", { name: "Complaint received" })).toBeVisible();
    const ticket = (await page.locator("p.font-mono").first().textContent())?.trim() ?? "";
    expect(ticket).toMatch(/^CU-\d{4}-\d{6}$/);

    await page.goto("/complaints/track");
    await settle(page);
    await page.getByLabel("Ticket number").fill(ticket);
    await page.getByRole("button", { name: "Track" }).click();
    await expect(page.getByText("Received").first()).toBeVisible();
    await expect(page.getByText(ticket).first()).toBeVisible();
  });
});

test.describe("Chatbot", () => {
  test("asking a question returns an answer from the assistant", async ({ page }) => {
    await page.goto("/");
    await settle(page);
    await page.getByRole("button", { name: "Open campus assistant" }).click();
    const panel = page.getByRole("dialog", { name: "Campus assistant" });
    await expect(panel).toBeVisible();
    await panel.getByPlaceholder(/Ask in English/).fill("When is the next bus to campus?");
    await panel.getByRole("button", { name: "Send message" }).click();
    await expect(panel.getByText("When is the next bus to campus?")).toBeVisible();
    await expect(panel.getByRole("status", { name: "Assistant is typing" })).toBeHidden({ timeout: 30_000 });
    await expect(panel.locator("[data-role=assistant]").first()).toBeVisible();
  });
});
