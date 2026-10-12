import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams, parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { listRegistrations } from "@/server/services/registration.service";
import { registrationListQuerySchema } from "@/server/validators/event.validators";

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/events/[id]/registrations">) => {
  const actor = await requirePermission(request, Permission.EventsCheckIn);
  const { id } = parseParams(await context.params, idParamsSchema);
  const query = parseQuery(request, registrationListQuerySchema);
  const page = await listRegistrations(actor, id, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
