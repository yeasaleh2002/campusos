import bcrypt from "bcryptjs";
import { z } from "zod";

export const BCRYPT_COST = 12;

/**
 * Frequently breached passwords that still satisfy the composition rules.
 * Compared case-insensitively.
 */
const COMMON_PASSWORDS = new Set([
  "password1",
  "password12",
  "password123",
  "password1234",
  "passw0rd",
  "p@ssw0rd",
  "p@ssword1",
  "qwerty123",
  "qwerty1234",
  "qwertyuiop1",
  "abc12345",
  "abcd1234",
  "abcdef123",
  "admin123",
  "admin1234",
  "administrator1",
  "welcome1",
  "welcome123",
  "letmein1",
  "letmein123",
  "iloveyou1",
  "sunshine1",
  "princess1",
  "football1",
  "baseball1",
  "monkey123",
  "dragon123",
  "master123",
  "trustno1",
  "changeme1",
  "changeme123",
  "test1234",
  "testing123",
  "zaq12wsx",
  "1q2w3e4r",
  "1qaz2wsx",
  "aa123456",
  "bangladesh1",
  "bangladesh123",
  "dhaka1234",
  "cityuniversity1",
  "campusos1",
  "student123",
]);

/** Password policy: 8-72 chars (bcrypt limit), upper, lower, digit, not a common password. */
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password must be at most 72 characters.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[0-9]/, "Password must contain a number.")
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "This password is too common. Please choose another.",
  });

/** Hashes a password with bcrypt (cost 12). */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

let dummyHash: Promise<string> | undefined;

/**
 * Compares a password against a hash. When `hash` is null (unknown user) it still
 * runs a full bcrypt comparison against a dummy hash so response time does not
 * reveal whether the account exists.
 */
export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (hash) return bcrypt.compare(plain, hash);
  dummyHash ??= bcrypt.hash("campusos-timing-equaliser", BCRYPT_COST);
  await bcrypt.compare(plain, await dummyHash);
  return false;
}
