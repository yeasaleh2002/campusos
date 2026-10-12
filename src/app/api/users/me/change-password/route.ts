import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { attachSessionCookie } from "@/server/middleware/session-cookie";
import { changePassword } from "@/server/services/user.service";
import { changePasswordSchema } from "@/server/validators/auth.validators";

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "change-password", RATE_LIMITS.authStrict);
  const user = await requireAuth(request);
  const body = await parseJsonBody(request, changePasswordSchema);

  // tokenVersion was bumped: other devices are signed out, this one gets a fresh cookie.
  const subject = await changePassword(user.id, body);
  const response = ok({ message: "Password changed. Other devices have been signed out." });
  await attachSessionCookie(response, subject);
  return response;
});
