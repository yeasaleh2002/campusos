import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { OTP_DELIVERY_INFO, resendOtp } from "@/server/services/auth.service";
import { resendOtpSchema } from "@/server/validators/auth.validators";

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "resend-otp", RATE_LIMITS.authStrict);
  const { email, purpose } = await parseJsonBody(request, resendOtpSchema);

  await resendOtp(email, purpose);
  return ok({ message: "If this email needs a code, a new one has been sent.", ...OTP_DELIVERY_INFO });
});
