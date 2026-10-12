import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { attachSessionCookie } from "@/server/middleware/session-cookie";
import { verifyEmail } from "@/server/services/auth.service";
import { getProfile } from "@/server/services/user.service";
import { verifyEmailSchema } from "@/server/validators/auth.validators";

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "verify-email", RATE_LIMITS.authStrict);
  const { email, code } = await parseJsonBody(request, verifyEmailSchema);

  const subject = await verifyEmail(email, code);
  const response = ok({ message: "Email verified. You're now signed in.", user: await getProfile(subject.id) });
  await attachSessionCookie(response, subject);
  return response;
});
