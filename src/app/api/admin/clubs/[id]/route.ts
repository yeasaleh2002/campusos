import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin, parseJsonBody } from "@/server/middleware/request-guards";
import { deleteClub, updateClub } from "@/server/services/club.service";
import { updateClubSchema } from "@/server/validators/club.validators";

type Context = RouteContext<"/api/admin/clubs/[id]">;

/** ADMIN+: any field. CLUB_ADMIN: description/logo/cover/category of their own club. */
export const PATCH = withApiHandler(async (request: NextRequest, context: Context) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.EventsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, updateClubSchema);
  return ok(await updateClub(actor, id, input, request));
});

export const DELETE = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.ClubsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  await deleteClub(actor, id, request);
  return ok({ message: "Club deleted.", id });
});
