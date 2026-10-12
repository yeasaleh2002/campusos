import { can, Permission } from "@/lib/auth/rbac";
import { ForbiddenError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/server/middleware/auth";
import { verifyUpload } from "@/server/services/upload.service";

/**
 * Club ids a CLUB_ADMIN administers, or null meaning "every club" (ADMIN,
 * SUPER_ADMIN, and MODERATOR for check-in). Route guards check the permission
 * itself; this only narrows the scope.
 */
export async function managedClubIds(actor: AuthUser): Promise<string[] | null> {
  if (actor.role !== "CLUB_ADMIN") return null;
  const memberships = await prisma.clubMember.findMany({
    where: { userId: actor.id, role: "ADMIN" },
    select: { clubId: true },
  });
  return memberships.map((membership) => membership.clubId);
}

/** Throws 403 unless the actor may manage `clubId`. */
export async function assertClubAccess(actor: AuthUser, clubId: string): Promise<void> {
  const scope = await managedClubIds(actor);
  if (scope !== null && !scope.includes(clubId)) {
    throw new ForbiddenError("You can only manage your own club.");
  }
}

/** Prisma `where` fragment restricting a query to the actor's clubs. */
export async function clubScopeWhere(actor: AuthUser): Promise<{ clubId?: { in: string[] } }> {
  const scope = await managedClubIds(actor);
  return scope === null ? {} : { clubId: { in: scope } };
}

/**
 * Validates an image URL a staff member wants to store. Admins may reuse any
 * tracked image; other staff only their own uploads.
 */
export async function verifyStaffImage(actor: AuthUser, url: string | null | undefined, field: string): Promise<void> {
  if (!url) return;
  await verifyUpload(url, { kind: "IMAGE", field, ownerId: can(actor, Permission.UsersManage) ? undefined : actor.id });
}
