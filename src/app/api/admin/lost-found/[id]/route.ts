import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { moderateItem } from "@/server/services/lost-found.service";
import { moderateItemSchema } from "@/server/validators/lost-found.validators";

/** Moderate a post: HIDE (abusive), RESTORE, RESOLVE or REMOVE. */
export const PATCH = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/lost-found/[id]">) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.LostFoundModerate);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, moderateItemSchema);
  return ok(await moderateItem(actor, id, input, request));
});
