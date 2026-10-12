import { after } from "next/server";
import { OtpPurpose } from "@/generated/prisma/enums";
import { OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS } from "@/lib/auth/otp";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { isStaff } from "@/lib/auth/rbac";
import { AppError, ConflictError, RateLimitError, ServiceUnavailableError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { passwordChangedEmail, welcomeEmail } from "@/server/email/templates";
import {
  clearLoginFailures,
  getLockoutSeconds,
  RATE_LIMITS,
  rateLimitByKey,
  registerLoginFailure,
} from "@/server/middleware/rate-limit";
import { type SessionUser, userRepository } from "@/server/repositories/user.repository";
import { sendEmailAfterResponse } from "@/server/services/email.service";
import { issueOtp, otpError, type OtpRecipient, verifyOtp } from "@/server/services/otp.service";
import type { LoginInput, ResetPasswordInput, SignupInput } from "@/server/validators/auth.validators";

export const OTP_DELIVERY_INFO = {
  otpExpiresInSeconds: OTP_TTL_MS / 1000,
  resendCooldownSeconds: OTP_RESEND_COOLDOWN_MS / 1000,
} as const;

/** Claims needed to issue a session cookie. */
export type SessionSubject = Pick<SessionUser, "id" | "role" | "tokenVersion">;

const INVALID_CREDENTIALS = () => new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
const EMAIL_DELIVERY_FAILED = () =>
  new ServiceUnavailableError(
    "EMAIL_DELIVERY_FAILED",
    "We couldn't send the email right now. Please try again in a moment.",
  );

async function resolveDepartmentId(code: string | null | undefined): Promise<string | null | undefined> {
  if (code === undefined || code === null) return code;
  const id = await userRepository.findDepartmentIdByCode(code);
  if (!id) throw new ValidationError(undefined, [{ path: "department", message: "Unknown department." }]);
  return id;
}

/**
 * Creates (or refreshes an unverified) account and emails a verification OTP.
 * Re-submitting signup for an unverified email is allowed so a failed email can be
 * retried; verified emails are rejected with 409.
 */
export async function signup(input: SignupInput): Promise<{ email: string; resendAvailableInSeconds: number }> {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, isEmailVerified: true },
  });
  if (existing?.isEmailVerified) throw new ConflictError("An account with this email already exists.");

  const data = {
    name: input.name,
    passwordHash: await hashPassword(input.password),
    studentId: input.studentId ?? null,
    departmentId: (await resolveDepartmentId(input.department)) ?? null,
    batch: input.batch ?? null,
  };
  const user: OtpRecipient = existing
    ? await prisma.user.update({ where: { id: existing.id }, data, select: { id: true, name: true, email: true } })
    : await prisma.user.create({ data: { ...data, email: input.email }, select: { id: true, name: true, email: true } });

  const otp = await issueOtp(user, OtpPurpose.SIGNUP_VERIFY);
  if (otp.status === "email_failed") throw EMAIL_DELIVERY_FAILED();
  return {
    email: user.email,
    resendAvailableInSeconds:
      otp.status === "cooldown" ? otp.retryAfterSeconds : OTP_DELIVERY_INFO.resendCooldownSeconds,
  };
}

/** Verifies the signup OTP, marks the email verified and returns the user to sign in. */
export async function verifyEmail(email: string, code: string): Promise<SessionSubject> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isEmailVerified: true, isActive: true, deletedAt: true },
  });
  if (!user || user.isEmailVerified || !user.isActive || user.deletedAt) throw otpError("invalid");

  const result = await verifyOtp(user.id, OtpPurpose.SIGNUP_VERIFY, code);
  if (result !== "valid") throw otpError(result);

  const now = new Date();
  const verified = await prisma.user.update({
    where: { id: user.id },
    data: { isEmailVerified: true, emailVerifiedAt: now, lastLoginAt: now },
    select: { id: true, role: true, tokenVersion: true },
  });
  sendEmailAfterResponse(user, () => welcomeEmail({ name: user.name }), "welcome");
  return verified;
}

/**
 * Re-sends an OTP. Returns silently when there is nothing to send (unknown email,
 * already verified) to avoid account enumeration; enforces cooldown + per-email cap.
 */
export async function resendOtp(email: string, purpose: OtpPurpose): Promise<void> {
  await rateLimitByKey("otp-email", email, RATE_LIMITS.otpPerEmail);
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, isEmailVerified: true, isActive: true, deletedAt: true },
  });
  if (!user || !user.isActive || user.deletedAt) return;
  if (purpose === OtpPurpose.SIGNUP_VERIFY && user.isEmailVerified) return;

  const otp = await issueOtp(user, purpose);
  if (otp.status === "cooldown") {
    throw new RateLimitError(otp.retryAfterSeconds, "Please wait before requesting another code.");
  }
  if (otp.status === "email_failed") throw EMAIL_DELIVERY_FAILED();
}

interface LoginOptions {
  /** Admin console login: only staff roles may sign in. */
  staffOnly: boolean;
}

/**
 * Password login with email+IP lockout (5 failures / 15 min). Every failure mode
 * returns the same generic error. Correct credentials on an unverified account
 * trigger a fresh OTP and EMAIL_NOT_VERIFIED.
 */
export async function login(input: LoginInput, ip: string, options: LoginOptions): Promise<SessionSubject> {
  const lockedSeconds = await getLockoutSeconds(input.email, ip);
  if (lockedSeconds > 0) {
    throw new RateLimitError(lockedSeconds, "Too many failed sign-in attempts. Please try again later.");
  }

  const user = await userRepository.findCredentialsByEmail(input.email);
  const passwordMatches = await verifyPassword(input.password, user?.passwordHash ?? null);
  const allowed =
    user !== null &&
    passwordMatches &&
    user.isActive &&
    user.deletedAt === null &&
    (!options.staffOnly || isStaff(user));

  if (!allowed) {
    await registerLoginFailure(input.email, ip);
    throw INVALID_CREDENTIALS();
  }

  if (!user.isEmailVerified) {
    const otp = await issueOtp(user, OtpPurpose.SIGNUP_VERIFY);
    throw new AppError(
      403,
      "EMAIL_NOT_VERIFIED",
      otp.status === "sent"
        ? "Please verify your email. We've sent you a new code."
        : "Please verify your email with the code we sent you.",
    );
  }

  await clearLoginFailures(input.email, ip);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }, select: { id: true } });
  return { id: user.id, role: user.role, tokenVersion: user.tokenVersion };
}

/**
 * Starts a password reset. Callers always respond with the same message; the
 * lookup and email run after the response so timing does not reveal accounts.
 */
export function requestPasswordReset(email: string): void {
  after(async () => {
    const withinLimit = await rateLimitByKey("otp-email", email, RATE_LIMITS.otpPerEmail)
      .then(() => true)
      .catch(() => false);
    if (!withinLimit) return;

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, isActive: true, deletedAt: true },
    });
    if (user?.isActive && !user.deletedAt) await issueOtp(user, OtpPurpose.PASSWORD_RESET);
  });
}

/**
 * Completes a reset: sets the new password, revokes all sessions (tokenVersion++),
 * invalidates outstanding OTPs and sends a "password changed" notice.
 */
export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true, name: true, email: true, isActive: true, deletedAt: true },
  });
  if (!user || !user.isActive || user.deletedAt) throw otpError("invalid");

  const result = await verifyOtp(user.id, OtpPurpose.PASSWORD_RESET, input.code);
  if (result !== "valid") throw otpError(result);

  const now = new Date();
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(input.newPassword),
        tokenVersion: { increment: 1 },
        // Completing a reset proves ownership of the inbox.
        isEmailVerified: true,
        emailVerifiedAt: now,
      },
      select: { id: true },
    }),
    prisma.emailOtp.updateMany({ where: { userId: user.id, consumedAt: null }, data: { consumedAt: now } }),
  ]);
  sendEmailAfterResponse(user, () => passwordChangedEmail({ name: user.name, changedAt: now }), "password-changed");
}

/** Revokes every session for the user by bumping tokenVersion. */
export async function logoutEverywhere(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { tokenVersion: { increment: 1 } }, select: { id: true } });
}
