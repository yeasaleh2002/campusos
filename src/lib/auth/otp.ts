import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import type { OtpPurpose } from "@/generated/prisma/enums";
import { env } from "@/lib/env";

/** OTP policy. */
export const OTP_LENGTH = 6;
export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;

/** Uniformly random 6-digit code (CSPRNG), zero-padded. */
export function generateOtpCode(): string {
  return randomInt(0, 10 ** OTP_LENGTH).toString().padStart(OTP_LENGTH, "0");
}

/**
 * HMAC-SHA256(JWT_SECRET, purpose:userId:code). Binding the user and purpose means a
 * code issued for one account/flow can never be replayed against another.
 */
export function hashOtpCode(code: string, userId: string, purpose: OtpPurpose): string {
  return createHmac("sha256", env.JWT_SECRET).update(`${purpose}:${userId}:${code}`).digest("hex");
}

export interface OtpRecord {
  userId: string;
  purpose: OtpPurpose;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
}

export type OtpCheckResult = "valid" | "invalid" | "expired" | "too_many_attempts" | "consumed";

/** Pure OTP check (no side effects). The caller increments attempts on "invalid". */
export function checkOtp(record: OtpRecord, code: string, now: Date = new Date()): OtpCheckResult {
  if (record.consumedAt) return "consumed";
  if (record.expiresAt.getTime() <= now.getTime()) return "expired";
  if (record.attempts >= OTP_MAX_ATTEMPTS) return "too_many_attempts";

  const expected = Buffer.from(record.codeHash, "hex");
  const actual = Buffer.from(hashOtpCode(code, record.userId, record.purpose), "hex");
  const matches = expected.length === actual.length && timingSafeEqual(expected, actual);
  return matches ? "valid" : "invalid";
}

/** Milliseconds until a new OTP may be sent, given when the last one was issued. */
export function resendCooldownRemainingMs(lastIssuedAt: Date | null, now: Date = new Date()): number {
  if (!lastIssuedAt) return 0;
  return Math.max(0, lastIssuedAt.getTime() + OTP_RESEND_COOLDOWN_MS - now.getTime());
}
