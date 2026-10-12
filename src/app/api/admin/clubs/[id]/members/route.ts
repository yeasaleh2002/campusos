import type { NextRequest } from "next/server";
import { created, paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams, parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { addClubMember, listClubMembers } from "@/server/services/club-member.service";
import { addClubMemberSchema, clubMemberListQuerySchema } from "@/server/validators/club.validators";

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/clubs/[id]/members">) => {
  const actor = await requirePermission(request, Permission.EventsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const query = parseQuery(request, clubMemberListQuerySchema);
  const page = await listClubMembers(actor, id, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

export const POST = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/clubs/[id]/members">) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.EventsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, addClubMemberSchema);
  return created(await addClubMember(actor, id, input, request));
});
