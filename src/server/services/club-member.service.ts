import type { Prisma } from "@/generated/prisma/client";
import type { ClubMemberRole } from "@/generated/prisma/enums";
import { can, Permission } from "@/lib/auth/rbac";
import { revalidateClubs } from "@/lib/cache-tags";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import { assertClubAccess } from "@/server/services/club-access.service";
import type { AddClubMemberInput } from "@/server/validators/club.validators";

const memberSelect = {
  id: true,
  role: true,
  joinedAt: true,
  user: { select: { id: true, name: true, email: true, role: true } },
} satisfies Prisma.ClubMemberSelect;

export type ClubMemberRow = Prisma.ClubMemberGetPayload<{ select: typeof memberSelect }>;

async function assertClubExists(clubId: string): Promise<void> {
  const club = await prisma.club.findFirst({ where: { id: clubId, deletedAt: null }, select: { id: true } });
  if (!club) throw new NotFoundError("Club not found.");
}

/** Only clubs:manage (ADMIN and above) may hand out or take away the club-admin role. */
function assertCanGrant(actor: AuthUser, role: ClubMemberRole): void {
  if (role === "ADMIN" && !can(actor, Permission.ClubsManage)) throw new ForbiddenError("Only an admin can assign club admins.");
}

async function syncMemberCount(tx: Prisma.TransactionClient, clubId: string): Promise<void> {
  const memberCount = await tx.clubMember.count({ where: { clubId } });
  await tx.club.update({ where: { id: clubId }, data: { memberCount }, select: { id: true } });
}

/** Keeps User.role consistent with club-admin memberships: promote to CLUB_ADMIN, demote when none remain. */
async function syncClubAdminRole(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user || (user.role !== "USER" && user.role !== "CLUB_ADMIN")) return;
  const adminships = await tx.clubMember.count({ where: { userId, role: "ADMIN" } });
  const role = adminships > 0 ? "CLUB_ADMIN" : "USER";
  if (role !== user.role) await tx.user.update({ where: { id: userId }, data: { role, tokenVersion: { increment: 1 } }, select: { id: true } });
}

export async function listClubMembers(actor: AuthUser, clubId: string, query: { cursor?: string; limit: number }): Promise<Page<ClubMemberRow>> {
  await assertClubAccess(actor, clubId);
  await assertClubExists(clubId);
  const rows = await prisma.clubMember.findMany({
    where: { clubId },
    select: memberSelect,
    orderBy: [{ role: "desc" }, { id: "asc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

/** Adds a member (or changes their role) by email. */
export async function addClubMember(actor: AuthUser, clubId: string, input: AddClubMemberInput, request: Request): Promise<ClubMemberRow> {
  await assertClubAccess(actor, clubId);
  assertCanGrant(actor, input.role);
  await assertClubExists(clubId);
  const target = await prisma.user.findFirst({ where: { email: input.email, deletedAt: null, isActive: true }, select: { id: true } });
  if (!target) throw new NotFoundError("No active account uses that email.");

  const member = await prisma.$transaction(async (tx) => {
    const existing = await tx.clubMember.findUnique({ where: { userId_clubId: { userId: target.id, clubId } }, select: { role: true } });
    if (existing) assertCanGrant(actor, existing.role);
    if (existing?.role === input.role) throw new ConflictError("They already have this role in the club.");
    const row = await tx.clubMember.upsert({
      where: { userId_clubId: { userId: target.id, clubId } },
      create: { userId: target.id, clubId, role: input.role },
      update: { role: input.role },
      select: memberSelect,
    });
    await syncMemberCount(tx, clubId);
    await syncClubAdminRole(tx, target.id);
    return row;
  });
  await audit(actor, "club.member_set", { type: "Club", id: clubId }, { userId: target.id, role: input.role }, request);
  revalidateClubs(clubId);
  return member;
}

export async function removeClubMember(actor: AuthUser, clubId: string, userId: string, request: Request): Promise<void> {
  await assertClubAccess(actor, clubId);
  const member = await prisma.clubMember.findUnique({ where: { userId_clubId: { userId, clubId } }, select: { role: true } });
  if (!member) throw new NotFoundError("Member not found.");
  assertCanGrant(actor, member.role);
  await prisma.$transaction(async (tx) => {
    await tx.clubMember.delete({ where: { userId_clubId: { userId, clubId } }, select: { id: true } });
    await syncMemberCount(tx, clubId);
    await syncClubAdminRole(tx, userId);
  });
  await audit(actor, "club.member_remove", { type: "Club", id: clubId }, { userId }, request);
  revalidateClubs(clubId);
}
