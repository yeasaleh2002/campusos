import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { listMyRegistrations } from "@/server/services/registration.service";
import { myRegistrationsQuerySchema } from "@/server/validators/event.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  const query = parseQuery(request, myRegistrationsQuerySchema);
  const page = await listMyRegistrations(user, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor }, { "cache-control": "private, no-store" });
});
