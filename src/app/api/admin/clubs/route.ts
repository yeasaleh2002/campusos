import type { NextRequest } from "next/server";
import { created, paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createClub, listAdminClubs } from "@/server/services/club.service";
import { adminClubListQuerySchema, createClubSchema } from "@/server/validators/club.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  const actor = await requirePermission(request, Permission.EventsManage);
  const query = parseQuery(request, adminClubListQuerySchema);
  const page = await listAdminClubs(actor, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.ClubsManage);
  const input = await parseJsonBody(request, createClubSchema);
  return created(await createClub(actor, input, request));
});
