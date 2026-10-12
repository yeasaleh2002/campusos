import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getPublicClubs } from "@/server/queries/club.queries";
import { clubListQuerySchema } from "@/server/validators/club.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "clubs");
  const query = parseQuery(request, clubListQuerySchema);
  const page = await getPublicClubs(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
