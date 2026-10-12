import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { getAuthUser } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { handleChatMessage } from "@/server/services/chatbot.service";
import { chatMessageSchema } from "@/server/validators/helpdesk.validators";

/** Vercel function time budget (seconds). */
export const maxDuration = 30;

/** Ask the campus assistant. Works signed in or anonymously (anonymous = stricter limit). */
export const POST = withApiHandler(async (request: NextRequest) => {
  const user = await getAuthUser(request);
  await rateLimitByIp(request, user ? "chat-user" : "chat-anon", user ? RATE_LIMITS.chatUser : RATE_LIMITS.chatAnonymous);
  const input = await parseJsonBody(request, chatMessageSchema);
  return ok(await handleChatMessage(input, user), { headers: { "cache-control": "private, no-store" } });
});
