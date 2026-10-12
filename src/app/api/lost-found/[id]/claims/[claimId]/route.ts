import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { decideClaim } from "@/server/services/lost-found.service";
import { claimDecisionSchema, claimParamsSchema } from "@/server/validators/lost-found.validators";

/** Approve/reject a claim (reporter or moderator). Approving marks the item CLAIMED. */
export const PATCH = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/lost-found/[id]/claims/[claimId]">) => {
  await rateLimitByIp(request, "lost-found-write", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id, claimId } = parseParams(await context.params, claimParamsSchema);
  const { decision } = await parseJsonBody(request, claimDecisionSchema);
  return ok(await decideClaim(user, id, claimId, decision));
});
