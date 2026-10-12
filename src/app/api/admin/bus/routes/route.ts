import type { NextRequest } from "next/server";
import { created, ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createRoute, listAdminRoutes } from "@/server/services/bus.service";
import { createRouteSchema } from "@/server/validators/campus.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.BusesManage);
  return ok(await listAdminRoutes());
});

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.BusesManage);
  const input = await parseJsonBody(request, createRouteSchema);
  return created(await createRoute(actor, input, request));
});
