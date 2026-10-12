/**
 * Deterministic, fake environment for unit tests. Tests never read the real .env
 * and never touch the database or Brevo.
 */
const TEST_ENV: Record<string, string> = {
  NODE_ENV: "test",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_NAME: "CampusOS Test",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  DIRECT_URL: "postgresql://test:test@localhost:5432/test",
  JWT_SECRET: "test-secret-that-is-definitely-longer-than-32-chars",
  JWT_EXPIRES_IN: "7d",
  BREVO_API_KEY: "test-brevo-key",
  BREVO_SENDER_EMAIL: "noreply@example.com",
  BREVO_SENDER_NAME: "CampusOS Test",
  UPLOADTHING_TOKEN: "test-uploadthing-token",
  REVALIDATE_SECRET: "test-revalidate-secret",
  CRON_SECRET: "test-cron-secret-value",
  TURNSTILE_SECRET_KEY: "",
};

Object.assign(process.env, TEST_ENV);
