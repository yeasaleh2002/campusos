import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { hourBucket } from "@/lib/time";
import { parseQuery } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getNotices } from "@/server/queries/campus.queries";
import { noticeListQuerySchema } from "@/server/validators/campus.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "notices");
  const query = parseQuery(request, noticeListQuerySchema);
  const page = await getNotices(query, hourBucket());
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
