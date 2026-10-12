import type { NextRequest } from "next/server";
import { created, paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createEntry, listAdminEntries } from "@/server/services/knowledge.service";
import { adminEntryListQuerySchema, createEntrySchema } from "@/server/validators/helpdesk.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.KnowledgeManage);
  const query = parseQuery(request, adminEntryListQuerySchema);
  const page = await listAdminEntries(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.KnowledgeManage);
  const input = await parseJsonBody(request, createEntrySchema);
  return created(await createEntry(actor, input, request));
});
