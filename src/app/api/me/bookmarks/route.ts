import type { NextRequest } from "next/server";
import { z } from "zod";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { paginationShape, parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { listBookmarks } from "@/server/services/resource.service";

const querySchema = z.object(paginationShape).strict();

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const query = parseQuery(request, querySchema);
  const page = await listBookmarks(user, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor }, { "cache-control": "private, no-store" });
});
