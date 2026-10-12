import type { NextRequest } from "next/server";
import { created, paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createClosure, listClosures } from "@/server/services/calendar.service";
import { closureListQuerySchema, createClosureSchema } from "@/server/validators/calendar.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.CalendarManage);
  const query = parseQuery(request, closureListQuerySchema);
  const page = await listClosures(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.CalendarManage);
  const input = await parseJsonBody(request, createClosureSchema);
  return created(await createClosure(actor, input, request));
});
