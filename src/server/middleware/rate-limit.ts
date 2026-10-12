import { prisma } from "@/lib/prisma";
import { RateLimitError } from "@/lib/errors";
import { mailCaptureEnabled } from "@/server/services/mail-capture";
import { getClientIp } from "@/server/security/ip";
import {
  consume,
  MemoryRateLimitStore,
  type RateLimitRule,
  type RateLimitStore,
  type WindowState,
} from "@/server/security/rate-limiter";

const MINUTE = 60 * 1000;

/** Rate-limit tiers. */
export const RATE_LIMITS = {
  /** Auth endpoints (login, signup, OTP, reset) per IP. Relaxed only under the test-only E2E flag (never in production). */
  authStrict: { limit: mailCaptureEnabled ? 500 : 10, windowMs: 15 * MINUTE },
  /** Per-email cap on OTP emails (resend / forgot-password). */
  otpPerEmail: { limit: 5, windowMs: 60 * MINUTE },
  /** Authenticated write endpoints per IP. */
  write: { limit: 60, windowMs: MINUTE },
  /** File uploads per IP (CPU-heavy compression). */
  upload: { limit: 20, windowMs: 10 * MINUTE },
  /** Chatbot messages per IP: stricter for anonymous visitors. */
  chatAnonymous: { limit: 10, windowMs: MINUTE },
  chatUser: { limit: 30, windowMs: MINUTE },
  /** Ticket tracking by ticket+email (anti-enumeration). */
  ticketTrack: { limit: 10, windowMs: 15 * MINUTE },
  /** Search and chatbot per IP. */
  search: { limit: 30, windowMs: MINUTE },
  /** Public cached reads per IP (in-memory). */
  publicRead: { limit: 300, windowMs: MINUTE },
} as const satisfies Record<string, RateLimitRule>;

/** Postgres-backed store: one atomic upsert per hit, shared by all instances. */
export const dbRateLimitStore: RateLimitStore = {
  async hit(key, windowMs, now) {
    const freshResetAt = new Date(now.getTime() + windowMs);
    const rows = await prisma.$queryRaw<WindowState[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt")
      VALUES (${key}, 1, ${freshResetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count"   = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" <= ${now} THEN ${freshResetAt} ELSE "RateLimit"."resetAt" END
      RETURNING "count", "resetAt"`;
    return rows[0];
  },
};

const memoryStore = new MemoryRateLimitStore();

async function enforce(store: RateLimitStore, key: string, rule: RateLimitRule): Promise<void> {
  const result = await consume(store, key, rule);
  if (!result.allowed) throw new RateLimitError(result.retryAfterSeconds);
}

/** Throws 429 when the client IP exceeds `rule` for `scope` (DB-backed). */
export function rateLimitByIp(request: Request, scope: string, rule: RateLimitRule): Promise<void> {
  return enforce(dbRateLimitStore, `rl:${scope}:ip:${getClientIp(request)}`, rule);
}

/** Throws 429 when an arbitrary key (e.g. an email) exceeds `rule` (DB-backed). */
export function rateLimitByKey(scope: string, key: string, rule: RateLimitRule): Promise<void> {
  return enforce(dbRateLimitStore, `rl:${scope}:key:${key}`, rule);
}

/** Cheap per-instance limit for public cached reads. */
export function rateLimitPublicRead(request: Request, scope: string): Promise<void> {
  return enforce(memoryStore, `${scope}:${getClientIp(request)}`, RATE_LIMITS.publicRead);
}

// ───────────── Login lockout (5 failures / 15 min → locked 15 min) ─────────────

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCKOUT_MS = 15 * MINUTE;

function lockoutKey(email: string, ip: string): string {
  return `lockout:login:${email}:${ip}`;
}

/** Seconds remaining on an active lockout for this email+IP, or 0. */
export async function getLockoutSeconds(email: string, ip: string): Promise<number> {
  const row = await prisma.rateLimit.findUnique({
    where: { key: lockoutKey(email, ip) },
    select: { count: true, resetAt: true },
  });
  if (!row || row.count < LOGIN_MAX_FAILURES) return 0;
  const remainingMs = row.resetAt.getTime() - Date.now();
  return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/**
 * Records a failed login. On the 5th failure inside the window the lock is
 * (re)started so it lasts a full 15 minutes from that failure.
 */
export async function registerLoginFailure(email: string, ip: string): Promise<void> {
  const key = lockoutKey(email, ip);
  const now = new Date();
  const state = await dbRateLimitStore.hit(key, LOGIN_LOCKOUT_MS, now);
  if (state.count === LOGIN_MAX_FAILURES) {
    await prisma.rateLimit.update({
      where: { key },
      data: { resetAt: new Date(now.getTime() + LOGIN_LOCKOUT_MS) },
    });
  }
}

/** Clears the failure counter after a successful login. */
export async function clearLoginFailures(email: string, ip: string): Promise<void> {
  await prisma.rateLimit.deleteMany({ where: { key: lockoutKey(email, ip) } });
}
