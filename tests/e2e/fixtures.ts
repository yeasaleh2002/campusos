import { readFile } from "node:fs/promises";
import path from "node:path";
import { type APIRequestContext, type Page, type PlaywrightWorkerArgs, test as base, expect } from "@playwright/test";

export const BASE_URL = "http://localhost:3100";
const MAIL_FILE = path.join(process.cwd(), ".e2e", "mail.jsonl");
const ORIGIN_HEADER = { origin: BASE_URL };

interface CapturedMail {
  to: string;
  subject: string;
  text: string;
}

export interface Account {
  name: string;
  email: string;
  password: string;
}

/** Reads the newest captured email for `email` and returns its 6-digit code (polls up to 20 s). */
export async function readOtp(email: string): Promise<string> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const raw = await readFile(MAIL_FILE, "utf8").catch(() => "");
    const mails = raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line) as CapturedMail)
      .filter((mail) => mail.to === email);
    const code = mails[mails.length - 1]?.subject.match(/\b(\d{6})\b/)?.[1];
    if (code) return code;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No OTP email captured for ${email}. Is the dev server running with E2E_MAIL_CAPTURE=1?`);
}

export function uniqueAccount(label: string): Account {
  const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  return { name: `E2E ${label}`, email: `e2e.${label}.${stamp}@example.com`, password: "Campus2026xE2E" };
}

/** Signs up and verifies through the HTTP API (the UI path is covered in auth.spec.ts). */
async function registerViaApi(request: APIRequestContext, account: Account): Promise<void> {
  const token = await request.get("/api/security/form-token");
  const { data } = (await token.json()) as { data: { formToken: string; minAgeSeconds: number } };
  await new Promise((resolve) => setTimeout(resolve, (data.minAgeSeconds + 0.3) * 1000));
  const signup = await request.post("/api/auth/signup", { headers: ORIGIN_HEADER, data: { ...account, website: "", formToken: data.formToken } });
  expect(signup.ok(), await signup.text()).toBeTruthy();
  const verify = await request.post("/api/auth/verify-email", { headers: ORIGIN_HEADER, data: { email: account.email, code: await readOtp(account.email) } });
  expect(verify.ok(), await verify.text()).toBeTruthy();
}

type StorageState = Awaited<ReturnType<APIRequestContext["storageState"]>>;

/** Waits until the app is hydrated enough for client handlers (forms use RHF). */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
}

/**
 * One verified account per worker (created through the API), plus a signed-in
 * browser context built from its session cookie - so rate-limited auth
 * endpoints are hit only a handful of times per run.
 */
export const test = base.extend<{ authedPage: Page }, { session: { account: Account; state: StorageState } }>({
  session: [
    async ({ playwright }, provide) => {
      const request = await playwright.request.newContext({ baseURL: BASE_URL });
      const account = uniqueAccount("shared");
      await registerViaApi(request, account);
      const login = await request.post("/api/auth/login", { headers: ORIGIN_HEADER, data: { email: account.email, password: account.password, website: "" } });
      expect(login.ok(), await login.text()).toBeTruthy();
      const state = await request.storageState();
      await request.dispose();
      await provide({ account, state });
    },
    { scope: "worker" },
  ],
  authedPage: async ({ browser, session }, provide) => {
    const context = await browser.newContext({ baseURL: BASE_URL, storageState: session.state });
    const page = await context.newPage();
    await provide(page);
    await context.close();
  },
});

export type StaffSlot = 1 | 2 | 3 | 4;
export const STAFF_ROLE: Record<StaffSlot, string> = { 1: "SUPER_ADMIN", 2: "ADMIN", 3: "CLUB_ADMIN", 4: "MODERATOR" };

/** Signs a seeded staff account in through the admin login API (credentials come from .env, never printed). */
async function staffLogin(playwright: PlaywrightWorkerArgs["playwright"], slot: StaffSlot): Promise<StorageState> {
  const email = process.env[`ADMIN${slot}_EMAIL`];
  const password = process.env[`ADMIN${slot}_PASSWORD`];
  if (!email || !password) throw new Error(`ADMIN${slot}_EMAIL/PASSWORD are not set in .env.`);
  const request = await playwright.request.newContext({ baseURL: BASE_URL });
  const response = await request.post("/api/auth/admin/login", { headers: ORIGIN_HEADER, data: { email, password, website: "" } });
  expect(response.ok(), `staff ${slot} login: ${response.status()} ${(await response.text()).slice(0, 160)}`).toBeTruthy();
  const state = await request.storageState();
  await request.dispose();
  return state;
}

/** API client carrying a stored session (cookie jar) and the Origin header mutations require. */
export async function apiFrom(playwright: PlaywrightWorkerArgs["playwright"], state: StorageState): Promise<APIRequestContext> {
  return playwright.request.newContext({ baseURL: BASE_URL, storageState: state, extraHTTPHeaders: ORIGIN_HEADER });
}

/** A fresh verified student (own session), used for multi-user scenarios (races, IDOR, deactivation). */
export async function createStudent(playwright: PlaywrightWorkerArgs["playwright"], label: string): Promise<{ account: Account; state: StorageState }> {
  const request = await playwright.request.newContext({ baseURL: BASE_URL });
  const account = uniqueAccount(label);
  await registerViaApi(request, account);
  const login = await request.post("/api/auth/login", { headers: ORIGIN_HEADER, data: { email: account.email, password: account.password, website: "" } });
  expect(login.ok(), await login.text()).toBeTruthy();
  const state = await request.storageState();
  await request.dispose();
  return { account, state };
}

export const staffTest = test.extend<object, { staff: Record<StaffSlot, StorageState> }>({
  staff: [
    async ({ playwright }, provide) => {
      const states = {} as Record<StaffSlot, StorageState>;
      for (const slot of [1, 2, 3, 4] as const) states[slot] = await staffLogin(playwright, slot);
      await provide(states);
    },
    { scope: "worker" },
  ],
});

export { expect };
