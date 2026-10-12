import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { listKnowledgeGaps } from "@/server/services/chatbot.service";
import { unansweredQuerySchema } from "@/server/validators/helpdesk.validators";

/** Questions the bot couldn't answer (`type=unanswered`) or answers marked unhelpful (`type=unhelpful`). */
export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.ChatAnalyticsView);
  const { type, ...query } = parseQuery(request, unansweredQuerySchema);
  const page = await listKnowledgeGaps(type, query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
