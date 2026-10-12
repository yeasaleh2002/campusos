import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { cancelEvent } from "@/server/services/event.service";
import { cancelEventSchema } from "@/server/validators/event.validators";

export const POST = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/events/[id]/cancel">) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.EventsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const { reason } = await parseJsonBody(request, cancelEventSchema);
  return ok(await cancelEvent(actor, id, reason, request));
});
