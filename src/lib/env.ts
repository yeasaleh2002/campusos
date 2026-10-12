import { z } from "zod";

/**
 * Server-side environment, validated once at module load (fail fast).
 *
 * Only NEXT_PUBLIC_* values may reach the browser - read those through
 * `src/config/public-env.ts`, never through this module.
 */

if (typeof window !== "undefined") {
  throw new Error("src/lib/env.ts is server-only and must not be imported by client code.");
}

/** Treat `KEY=` and `KEY=""` as "not set" so optional values stay undefined. */
const blankToUndefined = (value: unknown): unknown =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const optionalString = z.preprocess(blankToUndefined, z.string().optional());
const optionalEmail = z.preprocess(blankToUndefined, z.email().optional());
const optionalPassword = z.preprocess(blankToUndefined, z.string().min(8).optional());

const postgresUrl = z
  .string()
  .regex(/^postgres(ql)?:\/\/.+/, "must be a postgres:// or postgresql:// connection string");

/** Durations accepted by jose's setExpirationTime, e.g. "7d", "12h", "30 minutes". */
const jwtDuration = z
  .string()
  .regex(
    /^\d+\s?(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|week|weeks|y|yr|yrs|year|years)$/i,
    'must be a duration like "7d" or "12h"',
  );

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  NEXT_PUBLIC_APP_URL: z.url(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("CampusOS - City University"),

  DATABASE_URL: postgresUrl,
  DIRECT_URL: postgresUrl,

  JWT_SECRET: z.string().min(32, "must be at least 32 characters"),
  JWT_EXPIRES_IN: jwtDuration.default("7d"),

  BREVO_API_KEY: z.string().min(1),
  BREVO_SENDER_EMAIL: z.email(),
  BREVO_SENDER_NAME: z.string().min(1),

  UPLOADTHING_TOKEN: z.string().min(1),

  REVALIDATE_SECRET: z.string().min(16, "must be at least 16 characters"),
  CRON_SECRET: z.string().min(16, "must be at least 16 characters"),

  LLM_API_KEY: optionalString,
  TURNSTILE_SECRET_KEY: optionalString,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: optionalString,
  /** Test-only: "1" writes outgoing email to .e2e/mail.jsonl instead of Brevo. Ignored when NODE_ENV=production. */
  E2E_MAIL_CAPTURE: z.preprocess(blankToUndefined, z.enum(["0", "1"]).optional()),

  // Seed-only credentials (prisma/seed.ts).
  ADMIN1_EMAIL: optionalEmail,
  ADMIN1_PASSWORD: optionalPassword,
  ADMIN2_EMAIL: optionalEmail,
  ADMIN2_PASSWORD: optionalPassword,
  ADMIN3_EMAIL: optionalEmail,
  ADMIN3_PASSWORD: optionalPassword,
  ADMIN4_EMAIL: optionalEmail,
  ADMIN4_PASSWORD: optionalPassword,
  DEMO_USER_EMAIL: optionalEmail,
  DEMO_USER_PASSWORD: optionalPassword,
});

export type Env = z.infer<typeof envSchema>;

/** Lists failing variable names and reasons - never their values. */
function formatEnvIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid or missing environment variables:\n${formatEnvIssues(parsed.error)}\n` +
        "Check your .env file against .env.example.",
    );
  }
  return parsed.data;
}

export const env: Env = loadEnv();

export const isProduction = env.NODE_ENV === "production";
