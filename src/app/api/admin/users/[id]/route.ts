import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { updateUser } from "@/server/services/platform.service";
import { updateUserSchema } from "@/server/validators/platform.validators";

/** Activate/deactivate or change role (only SUPER_ADMIN may grant or touch ADMIN/SUPER_ADMIN). */
export const PATCH = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/users/[id]">) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.UsersManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, updateUserSchema);
  return ok(await updateUser(actor, id, input, request));
});
