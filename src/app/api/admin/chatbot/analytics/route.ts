import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { requirePermission } from "@/server/middleware/auth";
import { getChatbotAnalytics } from "@/server/services/chatbot.service";

/** Chatbot quality over the last 30 days: answered vs unanswered, feedback, confidence distribution, top intents. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.ChatAnalyticsView);
  return ok(await getChatbotAnalytics(), { headers: { "cache-control": "private, no-store" } });
});
