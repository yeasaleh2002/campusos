import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { listForModeration } from "@/server/services/lost-found.service";
import { adminLostFoundQuerySchema } from "@/server/validators/lost-found.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.LostFoundModerate);
  const query = parseQuery(request, adminLostFoundQuerySchema);
  const page = await listForModeration(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
