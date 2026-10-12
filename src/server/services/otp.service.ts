import { OtpPurpose } from "@/generated/prisma/enums";
import {
  checkOtp,
  generateOtpCode,
  hashOtpCode,
  OTP_MAX_ATTEMPTS,
  OTP_TTL_MS,
  type OtpCheckResult,
  resendCooldownRemainingMs,
} from "@/lib/auth/otp";
import { AppError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { otpVerificationEmail, passwordResetEmail } from "@/server/email/templates";
import { sendEmail } from "@/server/services/email.service";

export interface OtpRecipient {
  id: string;
  name: string;
  email: string;
}

export type IssueOtpResult =
  | { status: "sent" }
  | { status: "cooldown"; retryAfterSeconds: number }
  | { status: "email_failed" };

const TTL_MINUTES = OTP_TTL_MS / 60_000;

function renderOtpEmail(recipient: OtpRecipient, purpose: OtpPurpose, code: string) {
  const input = { name: recipient.name, code, ttlMinutes: TTL_MINUTES };
  return purpose === OtpPurpose.SIGNUP_VERIFY ? otpVerificationEmail(input) : passwordResetEmail(input);
}

/**
 * Issues a new OTP and emails it. Enforces the 60s resend cooldown; once the
 * email is delivered, earlier unused codes for the same purpose are invalidated. If it cannot
 * be delivered the new code is deleted, so the user can retry immediately
 * without being blocked by the cooldown.
 */
export async function issueOtp(recipient: OtpRecipient, purpose: OtpPurpose): Promise<IssueOtpResult> {
  const now = new Date();
  const latest = await prisma.emailOtp.findFirst({
    where: { userId: recipient.id, purpose },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  const cooldownMs = resendCooldownRemainingMs(latest?.createdAt ?? null, now);
  if (cooldownMs > 0) return { status: "cooldown", retryAfterSeconds: Math.ceil(cooldownMs / 1000) };

  const code = generateOtpCode();
  const otp = await prisma.emailOtp.create({
    data: {
      userId: recipient.id,
      purpose,
      codeHash: hashOtpCode(code, recipient.id, purpose),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    },
    select: { id: true },
  });

  const result = await sendEmail(
    { email: recipient.email, name: recipient.name },
    renderOtpEmail(recipient, purpose, code),
    `otp-${purpose.toLowerCase()}`,
  );
  if (!result.ok) {
    // Undelivered: drop the new code; any earlier code the user holds stays valid.
    await prisma.emailOtp.delete({ where: { id: otp.id } });
    return { status: "email_failed" };
  }

  // Delivered: supersede every earlier unused code for this purpose.
  await prisma.emailOtp.updateMany({
    where: { userId: recipient.id, purpose, consumedAt: null, id: { not: otp.id } },
    data: { consumedAt: new Date() },
  });
  return { status: "sent" };
}

/**
 * Checks a code against the user's latest OTP for `purpose`. Wrong guesses
 * increment the attempt counter; a correct code is consumed atomically, so it
 * can only be used once even under concurrent requests.
 */
export async function verifyOtp(userId: string, purpose: OtpPurpose, code: string): Promise<OtpCheckResult> {
  const record = await prisma.emailOtp.findFirst({
    where: { userId, purpose },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true, purpose: true, codeHash: true, expiresAt: true, attempts: true, consumedAt: true },
  });
  if (!record) return "invalid";

  const result = checkOtp(record, code);
  if (result === "invalid") {
    await prisma.emailOtp.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
    return record.attempts + 1 >= OTP_MAX_ATTEMPTS ? "too_many_attempts" : "invalid";
  }
  if (result !== "valid") return result;

  const consumed = await prisma.emailOtp.updateMany({
    where: { id: record.id, consumedAt: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { consumedAt: new Date() },
  });
  return consumed.count === 1 ? "valid" : "consumed";
}

/** Maps a failed OTP check to a client-facing error. */
export function otpError(result: Exclude<OtpCheckResult, "valid">): AppError {
  switch (result) {
    case "expired":
      return new AppError(400, "OTP_EXPIRED", "This code has expired. Please request a new one.");
    case "too_many_attempts":
      return new AppError(400, "OTP_ATTEMPTS_EXCEEDED", "Too many incorrect attempts. Please request a new code.");
    default:
      return new AppError(400, "INVALID_OTP", "Invalid or expired code.");
  }
}
