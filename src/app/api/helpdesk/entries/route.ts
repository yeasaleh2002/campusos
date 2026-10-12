import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { RATE_LIMITS, rateLimitByIp, rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getHelpdeskEntries } from "@/server/queries/helpdesk.queries";
import { helpdeskListQuerySchema } from "@/server/validators/helpdesk.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  const query = parseQuery(request, helpdeskListQuerySchema);
  if (query.q) await rateLimitByIp(request, "helpdesk-search", RATE_LIMITS.search);
  else await rateLimitPublicRead(request, "helpdesk");
  const page = await getHelpdeskEntries(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
