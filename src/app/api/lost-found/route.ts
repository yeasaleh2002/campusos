import type { NextRequest } from "next/server";
import { created, paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp, rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { getLostFoundItems } from "@/server/queries/lost-found.queries";
import { createItem } from "@/server/services/lost-found.service";
import { createItemSchema, lostFoundListQuerySchema } from "@/server/validators/lost-found.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "lost-found");
  const { dateFrom, dateTo, ...query } = parseQuery(request, lostFoundListQuerySchema);
  const page = await getLostFoundItems({ ...query, dateFrom: dateFrom?.toISOString(), dateTo: dateTo?.toISOString() });
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

/** Report a lost or found item (photos from POST /api/upload/image, max 4). */
export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "lost-found-create", RATE_LIMITS.upload);
  const user = await requireAuth(request);
  const input = await parseJsonBody(request, createItemSchema);
  return created(await createItem(user, input));
});
