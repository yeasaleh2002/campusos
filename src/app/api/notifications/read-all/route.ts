import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { markAllRead } from "@/server/services/notification.service";

export const POST = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "notifications", RATE_LIMITS.write);
  const user = await requireAuth(request);
  return ok({ marked: await markAllRead(user.id) });
});
