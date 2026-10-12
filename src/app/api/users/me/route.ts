import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { updateProfile } from "@/server/services/user.service";
import { updateProfileSchema } from "@/server/validators/auth.validators";

export const PATCH = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "profile-update", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const body = await parseJsonBody(request, updateProfileSchema);

  return ok({ user: await updateProfile(user.id, body) });
});
