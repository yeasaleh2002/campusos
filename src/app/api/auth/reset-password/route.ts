import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { clearSessionCookie } from "@/server/middleware/session-cookie";
import { resetPassword } from "@/server/services/auth.service";
import { resetPasswordSchema } from "@/server/validators/auth.validators";

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "reset-password", RATE_LIMITS.authStrict);
  const body = await parseJsonBody(request, resetPasswordSchema);

  await resetPassword(body);
  const response = ok({ message: "Password updated. Please sign in with your new password." });
  clearSessionCookie(response);
  return response;
});
