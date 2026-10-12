import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { listMyComplaints } from "@/server/services/complaint.service";
import { myComplaintsQuerySchema } from "@/server/validators/lost-found.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const query = parseQuery(request, myComplaintsQuerySchema);
  const page = await listMyComplaints(user, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor }, { "cache-control": "private, no-store" });
});
