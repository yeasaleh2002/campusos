import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { resolveKnowledgeGap } from "@/server/services/chatbot.service";

/** Removes a handled question from the unanswered inbox. */
export const POST = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/chatbot/unanswered/[id]/resolve">) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.ChatAnalyticsView);
  const { id } = parseParams(await context.params, idParamsSchema);
  await resolveKnowledgeGap(actor, id, request);
  return ok({ resolved: true });
});
