import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { getAuthUser, requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp, rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { assertSameOrigin, parseJsonBody } from "@/server/middleware/request-guards";
import { getLostFoundItem } from "@/server/queries/lost-found.queries";
import { deleteItem, getViewerContext, updateItem } from "@/server/services/lost-found.service";
import { updateItemSchema } from "@/server/validators/lost-found.validators";

type Context = RouteContext<"/api/lost-found/[id]">;

/**
 * Public post (cached, contact-free) + per-viewer context when signed in:
 * the viewer's own claim, and the counterpart's contact ONLY for the reporter
 * and an approved claimer.
 */
export const GET = withApiHandler(async (request: NextRequest, context: Context) => {
  await rateLimitPublicRead(request, "lost-found-item");
  const { id } = parseParams(await context.params, idParamsSchema);
  const item = await getLostFoundItem(id);
  if (!item) throw new NotFoundError("Item not found.");
  const user = await getAuthUser(request);
  const viewer = await getViewerContext(id, user);
  return ok({ ...item, viewer }, user ? { headers: { "cache-control": "private, no-store" } } : {});
});

export const PATCH = withApiHandler(async (request: NextRequest, context: Context) => {
  await rateLimitByIp(request, "lost-found-write", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, updateItemSchema);
  return ok(await updateItem(user, id, input));
});

export const DELETE = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "lost-found-write", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  await deleteItem(user, id);
  return ok({ message: "Post deleted.", id });
});
