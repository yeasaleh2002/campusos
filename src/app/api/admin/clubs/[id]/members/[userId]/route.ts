import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin, parseJsonBody } from "@/server/middleware/request-guards";
import { addClubMember, removeClubMember } from "@/server/services/club-member.service";
import { clubMemberParamsSchema, updateClubMemberSchema } from "@/server/validators/club.validators";

/** Changes a member's role (granting ADMIN needs clubs:manage). */
export const PATCH = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/clubs/[id]/members/[userId]">) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.EventsManage);
  const { id, userId } = parseParams(await context.params, clubMemberParamsSchema);
  const { role } = await parseJsonBody(request, updateClubMemberSchema);
  const user = await prisma.user.findFirst({ where: { id: userId, deletedAt: null }, select: { email: true } });
  if (!user) throw new NotFoundError("User not found.");
  return ok(await addClubMember(actor, id, { email: user.email, role }, request));
});

export const DELETE = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/clubs/[id]/members/[userId]">) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.EventsManage);
  const { id, userId } = parseParams(await context.params, clubMemberParamsSchema);
  await removeClubMember(actor, id, userId, request);
  return ok({ removed: true });
});
