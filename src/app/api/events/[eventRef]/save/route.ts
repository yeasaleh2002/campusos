import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { saveEvent, unsaveEvent } from "@/server/services/registration.service";
import { eventIdParamsSchema } from "@/server/validators/event.validators";

type Context = RouteContext<"/api/events/[eventRef]/save">;

/** Bookmark an event (segment = event id). Idempotent. */
export const POST = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "event-save", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { eventRef: eventId } = parseParams(await context.params, eventIdParamsSchema);

  await saveEvent(user, eventId);
  return ok({ saved: true, eventId });
});

/** Remove a bookmark. Idempotent. */
export const DELETE = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "event-save", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { eventRef: eventId } = parseParams(await context.params, eventIdParamsSchema);

  await unsaveEvent(user, eventId);
  return ok({ saved: false, eventId });
});
