import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { getEventStats } from "@/server/services/event.service";

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/events/[id]/stats">) => {
  const actor = await requirePermission(request, Permission.EventsCheckIn);
  const { id } = parseParams(await context.params, idParamsSchema);
  return ok(await getEventStats(actor, id));
});
