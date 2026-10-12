import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { getComplaintForStaff, updateComplaint } from "@/server/services/complaint.service";
import { updateComplaintSchema } from "@/server/validators/lost-found.validators";

type Context = RouteContext<"/api/admin/complaints/[id]">;

export const GET = withApiHandler(async (request: NextRequest, context: Context) => {
  await requirePermission(request, Permission.ComplaintsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  return ok(await getComplaintForStaff(id), { headers: { "cache-control": "private, no-store" } });
});

/** Status / priority / assignee / note. Creates a timeline entry and notifies the complainant. */
export const PATCH = withApiHandler(async (request: NextRequest, context: Context) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.ComplaintsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, updateComplaintSchema);
  return ok(await updateComplaint(actor, id, input, request));
});
