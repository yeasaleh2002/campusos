import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { bookmarkResource, unbookmarkResource } from "@/server/services/resource.service";

type Context = RouteContext<"/api/resources/[id]/bookmark">;

export const POST = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "resource-bookmark", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  await bookmarkResource(user, id);
  return ok({ bookmarked: true, resourceId: id });
});

export const DELETE = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "resource-bookmark", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  await unbookmarkResource(user, id);
  return ok({ bookmarked: false, resourceId: id });
});
