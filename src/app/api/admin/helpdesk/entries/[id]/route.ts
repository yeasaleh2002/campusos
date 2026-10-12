import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin, parseJsonBody } from "@/server/middleware/request-guards";
import { deleteEntry, updateEntry } from "@/server/services/knowledge.service";
import { updateEntrySchema } from "@/server/validators/helpdesk.validators";

type Context = RouteContext<"/api/admin/helpdesk/entries/[id]">;

/** Edit fields; `{ "isPublished": false }` unpublishes, `true` publishes. */
export const PATCH = withApiHandler(async (request: NextRequest, context: Context) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.KnowledgeManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, updateEntrySchema);
  return ok(await updateEntry(actor, id, input, request));
});

export const DELETE = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.KnowledgeManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  await deleteEntry(actor, id, request);
  return ok({ message: "Entry deleted.", id });
});
