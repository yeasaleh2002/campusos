import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getPublicResourceById } from "@/server/queries/resource.queries";

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/resources/[id]">) => {
  await rateLimitPublicRead(request, "resource");
  const { id } = parseParams(await context.params, idParamsSchema);
  const resource = await getPublicResourceById(id);
  if (!resource) throw new NotFoundError("Resource not found.");
  return ok(resource);
});
