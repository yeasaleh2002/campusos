import { describe, expect, it } from "vitest";
import {
  checkOtp,
  generateOtpCode,
  hashOtpCode,
  OTP_MAX_ATTEMPTS,
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  type OtpRecord,
  resendCooldownRemainingMs,
} from "@/lib/auth/otp";

const NOW = new Date("2026-10-07T10:00:00Z");

function recordFor(code: string, overrides: Partial<OtpRecord> = {}): OtpRecord {
  return {
    userId: "user_1",
    purpose: "SIGNUP_VERIFY",
    codeHash: hashOtpCode(code, "user_1", "SIGNUP_VERIFY"),
    expiresAt: new Date(NOW.getTime() + OTP_TTL_MS),
    attempts: 0,
    consumedAt: null,
    ...overrides,
  };
}

describe("generateOtpCode", () => {
  it("always returns exactly 6 digits", () => {
    for (let i = 0; i < 500; i++) expect(generateOtpCode()).toMatch(/^\d{6}$/);
  });

  it("is not constant", () => {
    const codes = new Set(Array.from({ length: 50 }, generateOtpCode));
    expect(codes.size).toBeGreaterThan(40);
  });
});

describe("hashOtpCode", () => {
  it("is deterministic hex and never contains the code", () => {
    const hash = hashOtpCode("123456", "user_1", "SIGNUP_VERIFY");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashOtpCode("123456", "user_1", "SIGNUP_VERIFY"));
    expect(hash).not.toContain("123456");
  });

  it("is bound to user and purpose", () => {
    const base = hashOtpCode("123456", "user_1", "SIGNUP_VERIFY");
    expect(hashOtpCode("123456", "user_2", "SIGNUP_VERIFY")).not.toBe(base);
    expect(hashOtpCode("123456", "user_1", "PASSWORD_RESET")).not.toBe(base);
  });
});

describe("checkOtp", () => {
  it("accepts the right code", () => {
    expect(checkOtp(recordFor("482913"), "482913", NOW)).toBe("valid");
  });

  it("rejects a wrong code", () => {
    expect(checkOtp(recordFor("482913"), "000000", NOW)).toBe("invalid");
  });

  it("rejects a code issued for another purpose", () => {
    const resetRecord = recordFor("482913", {
      purpose: "PASSWORD_RESET",
      codeHash: hashOtpCode("482913", "user_1", "SIGNUP_VERIFY"),
    });
    expect(checkOtp(resetRecord, "482913", NOW)).toBe("invalid");
  });

  it("expires exactly at expiresAt", () => {
    const record = recordFor("482913");
    expect(checkOtp(record, "482913", new Date(record.expiresAt.getTime() - 1))).toBe("valid");
    expect(checkOtp(record, "482913", record.expiresAt)).toBe("expired");
  });

  it("locks after the max number of attempts, even with the right code", () => {
    expect(checkOtp(recordFor("482913", { attempts: OTP_MAX_ATTEMPTS - 1 }), "482913", NOW)).toBe("valid");
    expect(checkOtp(recordFor("482913", { attempts: OTP_MAX_ATTEMPTS }), "482913", NOW)).toBe("too_many_attempts");
  });

  it("cannot be reused once consumed", () => {
    expect(checkOtp(recordFor("482913", { consumedAt: NOW }), "482913", NOW)).toBe("consumed");
  });
});

describe("resendCooldownRemainingMs", () => {
  it("is zero when no OTP was issued", () => {
    expect(resendCooldownRemainingMs(null, NOW)).toBe(0);
  });

  it("counts down from 60 seconds", () => {
    const issued = new Date(NOW.getTime() - 15_000);
    expect(resendCooldownRemainingMs(issued, NOW)).toBe(OTP_RESEND_COOLDOWN_MS - 15_000);
    expect(resendCooldownRemainingMs(new Date(NOW.getTime() - OTP_RESEND_COOLDOWN_MS), NOW)).toBe(0);
  });
});
