import type { NextRequest } from "next/server";
import { z } from "zod";
import { created, paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { paginationShape, parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createNotice, listAdminNotices } from "@/server/services/notice.service";
import { createNoticeSchema } from "@/server/validators/campus.validators";

const querySchema = z.object(paginationShape).strict();

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.NoticesManage);
  const query = parseQuery(request, querySchema);
  const page = await listAdminNotices(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

/** Creates a notice; department/course followers and students are notified in-app. */
export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.NoticesManage);
  const input = await parseJsonBody(request, createNoticeSchema);
  return created(await createNotice(actor, input, request));
});
