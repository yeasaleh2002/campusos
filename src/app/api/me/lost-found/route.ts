import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { listMyItems } from "@/server/services/lost-found.service";
import { myLostFoundQuerySchema } from "@/server/validators/lost-found.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const query = parseQuery(request, myLostFoundQuerySchema);
  const page = await listMyItems(user, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor }, { "cache-control": "private, no-store" });
});
