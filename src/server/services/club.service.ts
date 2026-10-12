import type { Prisma } from "@/generated/prisma/client";
import { can, Permission } from "@/lib/auth/rbac";
import { revalidateClubs } from "@/lib/cache-tags";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlugVariant } from "@/lib/slug";
import { type Page, toPage } from "@/lib/validation";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import { assertClubAccess, managedClubIds, verifyStaffImage } from "@/server/services/club-access.service";
import type { AdminClubListQuery, CreateClubInput, UpdateClubInput } from "@/server/validators/club.validators";

const adminClubSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  logoUrl: true,
  coverUrl: true,
  category: true,
  isActive: true,
  memberCount: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { events: { where: { deletedAt: null } } } },
} satisfies Prisma.ClubSelect;

export type AdminClub = Prisma.ClubGetPayload<{ select: typeof adminClubSelect }>;

/** Fields a CLUB_ADMIN may edit on their own club; everything else needs clubs:manage. */
const CLUB_ADMIN_EDITABLE = new Set<keyof UpdateClubInput>(["description", "logoUrl", "coverUrl", "category"]);

async function availableSlug(desired: string, explicit: boolean, excludeId?: string): Promise<string> {
  const taken = await prisma.club.findFirst({ where: { slug: desired, id: excludeId ? { not: excludeId } : undefined }, select: { id: true } });
  if (!taken) return desired;
  if (explicit) throw new ConflictError("That slug is already in use.");
  return uniqueSlugVariant(desired);
}

/** Lists clubs for the admin console (CLUB_ADMIN: only their clubs). */
export async function listAdminClubs(actor: AuthUser, query: AdminClubListQuery): Promise<Page<AdminClub>> {
  const scope = await managedClubIds(actor);
  const rows = await prisma.club.findMany({
    where: {
      deletedAt: null,
      ...(query.includeInactive ? {} : { isActive: true }),
      ...(scope ? { id: { in: scope } } : {}),
      ...(query.q ? { name: { contains: query.q, mode: "insensitive" } } : {}),
    },
    select: adminClubSelect,
    orderBy: [{ name: "asc" }, { id: "asc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (club) => club.id);
}

/** Creates a club (clubs:manage). */
export async function createClub(actor: AuthUser, input: CreateClubInput, request: Request): Promise<AdminClub> {
  await Promise.all([verifyStaffImage(actor, input.logoUrl, "logoUrl"), verifyStaffImage(actor, input.coverUrl, "coverUrl")]);
  const nameTaken = await prisma.club.findUnique({ where: { name: input.name }, select: { id: true } });
  if (nameTaken) throw new ConflictError("A club with this name already exists.");

  const slug = await availableSlug(input.slug ?? slugify(input.name), input.slug !== undefined);
  const club = await prisma.club.create({ data: { ...input, slug }, select: adminClubSelect });

  await audit(actor, "club.create", { type: "Club", id: club.id }, { name: club.name }, request);
  revalidateClubs(club.id);
  return club;
}

/** Updates a club. CLUB_ADMINs may only edit presentation fields of their own clubs. */
export async function updateClub(actor: AuthUser, clubId: string, input: UpdateClubInput, request: Request): Promise<AdminClub> {
  const existing = await prisma.club.findFirst({ where: { id: clubId, deletedAt: null }, select: { id: true, slug: true } });
  if (!existing) throw new NotFoundError("Club not found.");

  if (!can(actor, Permission.ClubsManage)) {
    await assertClubAccess(actor, clubId);
    const forbidden = Object.keys(input).filter((key) => !CLUB_ADMIN_EDITABLE.has(key as keyof UpdateClubInput));
    if (forbidden.length) throw new ForbiddenError(`Club admins cannot change: ${forbidden.join(", ")}.`);
  }
  await Promise.all([verifyStaffImage(actor, input.logoUrl, "logoUrl"), verifyStaffImage(actor, input.coverUrl, "coverUrl")]);

  const slug = input.slug && input.slug !== existing.slug ? await availableSlug(input.slug, true, clubId) : undefined;
  const club = await prisma.club.update({ where: { id: clubId }, data: { ...input, slug }, select: adminClubSelect });

  await audit(actor, "club.update", { type: "Club", id: clubId }, { fields: Object.keys(input) }, request);
  revalidateClubs(clubId);
  return club;
}

/** Soft-deletes a club. Refused while it has upcoming published events. */
export async function deleteClub(actor: AuthUser, clubId: string, request: Request): Promise<void> {
  const club = await prisma.club.findFirst({ where: { id: clubId, deletedAt: null }, select: { id: true, name: true } });
  if (!club) throw new NotFoundError("Club not found.");

  const upcoming = await prisma.event.count({
    where: { clubId, deletedAt: null, status: "PUBLISHED", endAt: { gte: new Date() } },
  });
  if (upcoming > 0) throw new ConflictError("Cancel this club's upcoming events before deleting it.");

  await prisma.club.update({ where: { id: clubId }, data: { deletedAt: new Date(), isActive: false }, select: { id: true } });
  await audit(actor, "club.delete", { type: "Club", id: clubId }, { name: club.name }, request);
  revalidateClubs(clubId);
}
