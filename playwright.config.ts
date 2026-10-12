import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env");
} catch {
  // Variables provided by the environment (CI).
}

const PORT = 3100;

/**
 * E2E runs against `next dev` on its own port with the test-only mail hook on
 * (E2E_MAIL_CAPTURE=1 writes OTP emails to .e2e/mail.jsonl). The hook is
 * impossible to enable under NODE_ENV=production.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `node node_modules/next/dist/bin/next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Turnstile is blanked for the test server only, so a real key in .env never blocks automated logins.
    env: { E2E_MAIL_CAPTURE: "1", TURNSTILE_SECRET_KEY: "", NEXT_PUBLIC_TURNSTILE_SITE_KEY: "" },
  },
});
