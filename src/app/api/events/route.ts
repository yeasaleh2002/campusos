import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { hourBucket } from "@/lib/time";
import { parseQuery } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getPublicEvents } from "@/server/queries/event.queries";
import { eventListQuerySchema } from "@/server/validators/event.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "events");
  const { dateFrom, dateTo, ...query } = parseQuery(request, eventListQuerySchema);
  const page = await getPublicEvents(
    { ...query, dateFrom: dateFrom?.toISOString(), dateTo: dateTo?.toISOString() },
    hourBucket(),
  );
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
