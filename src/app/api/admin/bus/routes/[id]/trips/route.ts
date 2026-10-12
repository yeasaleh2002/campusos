import type { NextRequest } from "next/server";
import { created } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createTrip } from "@/server/services/bus.service";
import { createTripSchema } from "@/server/validators/campus.validators";

export const POST = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/bus/routes/[id]/trips">) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.BusesManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, createTripSchema);
  return created(await createTrip(actor, id, input, request));
});
