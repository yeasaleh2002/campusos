import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * Minimum-time-to-submit token: a signed issue timestamp handed to the form when
 * it renders. Bots that post instantly (or replay stale tokens) are rejected.
 */
export const FORM_TOKEN_MIN_AGE_MS = 2_000;
export const FORM_TOKEN_MAX_AGE_MS = 2 * 60 * 60 * 1000;

function sign(issuedAt: string): string {
  return createHmac("sha256", env.JWT_SECRET).update(`form-token:${issuedAt}`).digest("base64url");
}

/** Creates a token of the form `<issuedAtMs>.<hmac>`. */
export function createFormToken(now: Date = new Date()): string {
  const issuedAt = String(now.getTime());
  return `${issuedAt}.${sign(issuedAt)}`;
}

export type FormTokenResult = "valid" | "malformed" | "bad_signature" | "too_fast" | "expired";

/** Validates signature and age window. */
export function verifyFormToken(token: string | undefined, now: Date = new Date()): FormTokenResult {
  const [issuedAt, signature, ...rest] = (token ?? "").split(".");
  if (!issuedAt || !signature || rest.length > 0 || !/^\d{10,16}$/.test(issuedAt)) {
    return "malformed";
  }

  const expected = Buffer.from(sign(issuedAt));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return "bad_signature";
  }

  const ageMs = now.getTime() - Number(issuedAt);
  if (ageMs < FORM_TOKEN_MIN_AGE_MS) return "too_fast";
  if (ageMs > FORM_TOKEN_MAX_AGE_MS) return "expired";
  return "valid";
}
