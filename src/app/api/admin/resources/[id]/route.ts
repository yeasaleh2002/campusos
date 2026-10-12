import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin, parseJsonBody } from "@/server/middleware/request-guards";
import { deleteResource, updateResource } from "@/server/services/resource.service";
import { updateResourceSchema } from "@/server/validators/resource.validators";

type Context = RouteContext<"/api/admin/resources/[id]">;

export const PATCH = withApiHandler(async (request: NextRequest, context: Context) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.ResourcesModerate);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, updateResourceSchema);
  return ok(await updateResource(actor, id, input, request));
});

export const DELETE = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.ResourcesModerate);
  const { id } = parseParams(await context.params, idParamsSchema);
  await deleteResource(actor, id, request);
  return ok({ message: "Resource deleted.", id });
});
