import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin, parseJsonBody } from "@/server/middleware/request-guards";
import { follow, unfollow } from "@/server/services/follow.service";
import { followSchema } from "@/server/validators/campus.validators";

/** Follow a department, course or club (drives notice notifications). */
export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "follow", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const input = await parseJsonBody(request, followSchema);
  await follow(user, input);
  return ok({ following: true, ...input });
});

/** Unfollow: `DELETE /api/follow?targetType=COURSE&targetId=...` */
export const DELETE = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "follow", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const input = parseQuery(request, followSchema);
  await unfollow(user, input);
  return ok({ following: false, ...input });
});
