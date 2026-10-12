import type { NextRequest } from "next/server";
import { created, paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createEvent, listAdminEvents } from "@/server/services/event.service";
import { adminEventListQuerySchema, createEventSchema } from "@/server/validators/event.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  const actor = await requirePermission(request, Permission.EventsManage);
  const query = parseQuery(request, adminEventListQuerySchema);
  const page = await listAdminEvents(actor, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.EventsManage);
  const input = await parseJsonBody(request, createEventSchema);
  return created(await createEvent(actor, input, request));
});
