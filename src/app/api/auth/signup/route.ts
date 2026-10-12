import type { NextRequest } from "next/server";
import { created } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { assertHuman, isHoneypotTriggered } from "@/server/middleware/bot-protection";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { getClientIp } from "@/server/security/ip";
import { OTP_DELIVERY_INFO, signup } from "@/server/services/auth.service";
import { signupSchema } from "@/server/validators/auth.validators";

const SIGNUP_MESSAGE = "Account created. Enter the 6-digit code we sent to your email.";

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "signup", RATE_LIMITS.authStrict);
  const body = await parseJsonBody(request, signupSchema);

  // Honeypot hit: answer exactly like a real signup so bots learn nothing.
  if (isHoneypotTriggered(body)) {
    return created({
      message: SIGNUP_MESSAGE,
      email: body.email,
      ...OTP_DELIVERY_INFO,
      resendAvailableInSeconds: OTP_DELIVERY_INFO.resendCooldownSeconds,
    });
  }
  await assertHuman(body, getClientIp(request), { requireFormToken: true });

  const result = await signup(body);
  return created({
    message: SIGNUP_MESSAGE,
    email: result.email,
    ...OTP_DELIVERY_INFO,
    resendAvailableInSeconds: result.resendAvailableInSeconds,
  });
});
