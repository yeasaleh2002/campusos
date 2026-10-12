import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { changeStatus } from "@/server/services/lost-found.service";
import { itemStatusSchema } from "@/server/validators/lost-found.validators";

export const PATCH = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/lost-found/[id]/status">) => {
  await rateLimitByIp(request, "lost-found-write", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  const { status } = await parseJsonBody(request, itemStatusSchema);
  return ok(await changeStatus(user, id, status, request));
});
