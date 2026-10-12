import { decodeJwt, jwtVerify, SignJWT } from "jose";
import { z } from "zod";
import { Role } from "@/generated/prisma/enums";
import { env, isProduction } from "@/lib/env";

/**
 * Session JWT helpers. Depends only on `jose` + env so it is safe to use from
 * `src/proxy.ts` (no database access here).
 */

export const SESSION_COOKIE = "campusos_session";

const ISSUER = "campusos";
const AUDIENCE = "campusos-web";
const ALGORITHM = "HS256";

const sessionClaimsSchema = z.object({
  sub: z.string().min(1),
  role: z.enum(Role),
  tokenVersion: z.number().int().nonnegative(),
});

export type SessionClaims = z.infer<typeof sessionClaimsSchema>;

export interface SignedSession {
  token: string;
  expiresAt: Date;
}

const secretKey = new TextEncoder().encode(env.JWT_SECRET);

/** Signs a session JWT (HS256) that expires after `JWT_EXPIRES_IN`. */
export async function signSession(claims: SessionClaims): Promise<SignedSession> {
  const token = await new SignJWT({ role: claims.role, tokenVersion: claims.tokenVersion })
    .setProtectedHeader({ alg: ALGORITHM, typ: "JWT" })
    .setSubject(claims.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(env.JWT_EXPIRES_IN)
    .sign(secretKey);

  const { exp = 0 } = decodeJwt(token);
  return { token, expiresAt: new Date(exp * 1000) };
}

/** Verifies signature, issuer, audience, expiry and claim shape. Returns null when invalid. */
export async function verifySession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: [ALGORITHM],
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const parsed = sessionClaimsSchema.safeParse(payload);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Cookie attributes for the session cookie. */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    expires: expiresAt,
  };
}

/** Attributes that make the browser delete the session cookie. */
export function clearedSessionCookieOptions() {
  return { ...sessionCookieOptions(new Date(0)), maxAge: 0 };
}
