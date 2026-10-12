import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { clearSessionCookie } from "@/server/middleware/session-cookie";
import { logoutEverywhere } from "@/server/services/auth.service";

export const POST = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "logout-all", RATE_LIMITS.write);
  const user = await requireAuth(request);

  await logoutEverywhere(user.id);
  const response = ok({ message: "Signed out on all devices." });
  clearSessionCookie(response);
  return response;
});
