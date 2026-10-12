import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { listModerationQueue } from "@/server/services/resource.service";
import { adminResourceListQuerySchema } from "@/server/validators/resource.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.ResourcesModerate);
  const query = parseQuery(request, adminResourceListQuerySchema);
  const page = await listModerationQueue(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
