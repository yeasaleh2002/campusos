import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { listMyResources } from "@/server/services/resource.service";
import { myResourcesQuerySchema } from "@/server/validators/resource.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const query = parseQuery(request, myResourcesQuerySchema);
  const page = await listMyResources(user, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor }, { "cache-control": "private, no-store" });
});
