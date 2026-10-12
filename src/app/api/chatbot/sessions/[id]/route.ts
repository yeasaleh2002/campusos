import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseParams } from "@/lib/validation";
import { getAuthUser } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { getChatSession } from "@/server/services/chatbot.service";
import { sessionParamsSchema } from "@/server/validators/helpdesk.validators";

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/chatbot/sessions/[id]">) => {
  await rateLimitByIp(request, "chat-session", RATE_LIMITS.search);
  const user = await getAuthUser(request);
  const { id } = parseParams(await context.params, sessionParamsSchema);
  return ok(await getChatSession(id, user), { headers: { "cache-control": "private, no-store" } });
});
