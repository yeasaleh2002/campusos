import type { NextRequest } from "next/server";
import { created } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { fileClaim } from "@/server/services/lost-found.service";
import { claimSchema } from "@/server/validators/lost-found.validators";

export const POST = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/lost-found/[id]/claim">) => {
  await rateLimitByIp(request, "lost-found-claim", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  const { message } = await parseJsonBody(request, claimSchema);
  const claim = await fileClaim(user, id, message);
  return created({ message: "Claim sent. The reporter has been notified.", claim });
});
