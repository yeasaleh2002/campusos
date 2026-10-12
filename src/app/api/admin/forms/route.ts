import type { NextRequest } from "next/server";
import { z } from "zod";
import { created, paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { paginationShape, parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createForm, listAdminForms } from "@/server/services/notice.service";
import { createFormSchema } from "@/server/validators/campus.validators";

const querySchema = z.object(paginationShape).strict();

export const GET = withApiHandler(async (request: NextRequest) => {
  const actor = await requirePermission(request, Permission.FormsManage);
  const query = parseQuery(request, querySchema);
  const page = await listAdminForms(actor, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.FormsManage);
  const input = await parseJsonBody(request, createFormSchema);
  return created(await createForm(actor, input, request));
});
