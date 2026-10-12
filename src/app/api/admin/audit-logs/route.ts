import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { listAuditLogs } from "@/server/services/platform.service";
import { auditLogQuerySchema } from "@/server/validators/platform.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.AuditView);
  const query = parseQuery(request, auditLogQuerySchema);
  const page = await listAuditLogs(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor }, { "cache-control": "private, no-store" });
});
