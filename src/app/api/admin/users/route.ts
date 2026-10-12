import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { listUsers } from "@/server/services/platform.service";
import { adminUserListQuerySchema } from "@/server/validators/platform.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.UsersManage);
  const query = parseQuery(request, adminUserListQuerySchema);
  const page = await listUsers(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor }, { "cache-control": "private, no-store" });
});
