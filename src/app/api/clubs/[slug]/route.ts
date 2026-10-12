import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { hourBucket } from "@/lib/time";
import { parseParams, slugSchema } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getPublicClubBySlug } from "@/server/queries/club.queries";

const paramsSchema = z.object({ slug: slugSchema });

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/clubs/[slug]">) => {
  await rateLimitPublicRead(request, "club");
  const { slug } = parseParams(await context.params, paramsSchema);
  const club = await getPublicClubBySlug(slug, hourBucket());
  if (!club) throw new NotFoundError("Club not found.");
  return ok(club);
});
