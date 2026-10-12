import type { NextResponse } from "next/server";
import {
  clearedSessionCookieOptions,
  SESSION_COOKIE,
  sessionCookieOptions,
  signSession,
} from "@/lib/auth/session";
import type { SessionSubject } from "@/server/services/auth.service";

/** Signs a session JWT for `subject` and sets it as the httpOnly session cookie. */
export async function attachSessionCookie(response: NextResponse, subject: SessionSubject): Promise<void> {
  const { token, expiresAt } = await signSession({
    sub: subject.id,
    role: subject.role,
    tokenVersion: subject.tokenVersion,
  });
  response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
}

/** Expires the session cookie in the browser. */
export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(SESSION_COOKIE, "", clearedSessionCookieOptions());
}
