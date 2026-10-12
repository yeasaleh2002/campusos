import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Constant-time comparison of a presented secret with the expected one. Both
 * sides are hashed first so differing lengths don't leak through timing.
 */
export function secretsMatch(presented: string | null | undefined, expected: string): boolean {
  if (!presented) return false;
  const a = createHash("sha256").update(presented).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/** Extracts the token from an `Authorization: Bearer <token>` header. */
export function bearerToken(header: string | null): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(header ?? "");
  return match ? match[1].trim() : null;
}
