import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { bulkReviewResources } from "@/server/services/resource.service";
import { bulkReviewSchema } from "@/server/validators/resource.validators";

/** Vercel function time budget (seconds). */
export const maxDuration = 60;

/** Approve or reject up to 50 pending resources in one call; per-item failures are reported, not thrown. */
export const PATCH = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.ResourcesModerate);
  const { ids, ...review } = await parseJsonBody(request, bulkReviewSchema);
  return ok(await bulkReviewResources(actor, ids, review, request));
});
