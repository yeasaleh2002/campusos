import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseParams } from "@/lib/validation";
import { getAuthUser } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { recordFeedback } from "@/server/services/chatbot.service";
import { feedbackSchema, messageParamsSchema } from "@/server/validators/helpdesk.validators";

export const POST = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/chatbot/messages/[id]/feedback">) => {
  await rateLimitByIp(request, "chat-feedback", RATE_LIMITS.write);
  const user = await getAuthUser(request);
  const { id } = parseParams(await context.params, messageParamsSchema);
  const input = await parseJsonBody(request, feedbackSchema);
  await recordFeedback(id, input, user);
  return ok({ messageId: id, feedback: input.helpful ? "HELPFUL" : "NOT_HELPFUL" });
});
