import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { assertHuman, isHoneypotTriggered } from "@/server/middleware/bot-protection";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { getClientIp } from "@/server/security/ip";
import { OTP_DELIVERY_INFO, requestPasswordReset } from "@/server/services/auth.service";
import { forgotPasswordSchema } from "@/server/validators/auth.validators";

const GENERIC_MESSAGE = "If an account exists for this email, we've sent a password reset code.";

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "forgot-password", RATE_LIMITS.authStrict);
  const body = await parseJsonBody(request, forgotPasswordSchema);

  if (!isHoneypotTriggered(body)) {
    await assertHuman(body, getClientIp(request), { requireFormToken: true });
    requestPasswordReset(body.email);
  }
  // Identical response whether or not the account exists (no enumeration).
  return ok({ message: GENERIC_MESSAGE, otpExpiresInSeconds: OTP_DELIVERY_INFO.otpExpiresInSeconds });
});
