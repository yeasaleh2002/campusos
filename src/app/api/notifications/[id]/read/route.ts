import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { markRead } from "@/server/services/notification.service";

export const PATCH = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/notifications/[id]/read">) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "notifications", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  await markRead(user.id, id);
  return ok({ id, read: true });
});
