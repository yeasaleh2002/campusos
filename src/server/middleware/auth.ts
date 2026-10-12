import type { NextRequest } from "next/server";
import type { Role } from "@/generated/prisma/enums";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/session";
import { can, hasRole, type Permission, STAFF_ROLES } from "@/lib/auth/rbac";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { type SessionUser, userRepository } from "@/server/repositories/user.repository";

export type AuthUser = Pick<SessionUser, "id" | "name" | "email" | "role" | "tokenVersion">;

/**
 * Per-request memo: the JWT + DB check runs at most once per request, even if
 * several guards call it. Keyed by the request object, so nothing is shared
 * between requests or users.
 */
const requestCache = new WeakMap<Request, Promise<AuthUser | null>>();

async function resolveAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const claims = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!claims) return null;

  const user = await userRepository.findSessionUser(claims.sub);
  const sessionIsValid =
    user !== null &&
    user.isActive &&
    user.deletedAt === null &&
    user.isEmailVerified &&
    user.tokenVersion === claims.tokenVersion;
  if (!sessionIsValid) return null;

  return { id: user.id, name: user.name, email: user.email, role: user.role, tokenVersion: user.tokenVersion };
}

/** Verified session user (JWT valid, account active, tokenVersion current) or null. */
export function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  let pending = requestCache.get(request);
  if (!pending) {
    pending = resolveAuthUser(request);
    requestCache.set(request, pending);
  }
  return pending;
}

/** Returns the session user or throws 401. */
export async function requireAuth(request: NextRequest): Promise<AuthUser> {
  const user = await getAuthUser(request);
  if (!user) throw new UnauthorizedError();
  return user;
}

/** Returns the session user if their role is in `roles`; otherwise throws 401/403. */
export async function requireRole(request: NextRequest, roles: readonly Role[]): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (!hasRole(user, roles)) throw new ForbiddenError();
  return user;
}

/** Shortcut for admin-console endpoints. */
export function requireStaff(request: NextRequest): Promise<AuthUser> {
  return requireRole(request, STAFF_ROLES);
}

/** Returns the session user if they hold `permission`; otherwise throws 401/403. */
export async function requirePermission(request: NextRequest, permission: Permission): Promise<AuthUser> {
  const user = await requireAuth(request);
  if (!can(user, permission)) throw new ForbiddenError();
  return user;
}
