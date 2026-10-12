import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { recordDownload } from "@/server/services/resource.service";

export const POST = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/resources/[id]/download">) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "resource-download", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  return ok(await recordDownload(user, id), { headers: { "cache-control": "private, no-store" } });
});
