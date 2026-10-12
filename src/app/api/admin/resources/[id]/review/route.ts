import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { reviewResource } from "@/server/services/resource.service";
import { reviewResourceSchema } from "@/server/validators/resource.validators";

export const PATCH = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/resources/[id]/review">) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.ResourcesModerate);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, reviewResourceSchema);
  return ok(await reviewResource(actor, id, input, request));
});
