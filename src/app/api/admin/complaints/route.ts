import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { listComplaints } from "@/server/services/complaint.service";
import { adminComplaintsQuerySchema } from "@/server/validators/lost-found.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  const actor = await requirePermission(request, Permission.ComplaintsManage);
  const query = parseQuery(request, adminComplaintsQuerySchema);
  const page = await listComplaints(actor, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor }, { "cache-control": "private, no-store" });
});
