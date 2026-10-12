import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getLostFoundItem, getLostFoundMatches } from "@/server/queries/lost-found.queries";

/** Likely counterpart posts (opposite type) ranked by category, text similarity and date. */
export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/lost-found/[id]/matches">) => {
  await rateLimitPublicRead(request, "lost-found-matches");
  const { id } = parseParams(await context.params, idParamsSchema);
  if (!(await getLostFoundItem(id))) throw new NotFoundError("Item not found.");
  return ok(await getLostFoundMatches(id));
});
