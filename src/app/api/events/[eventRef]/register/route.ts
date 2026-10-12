import type { NextRequest } from "next/server";
import { created, ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { cancelRegistration, registerForEvent } from "@/server/services/registration.service";
import { eventIdParamsSchema } from "@/server/validators/event.validators";

type Context = RouteContext<"/api/events/[eventRef]/register">;

/** Register for an event (segment = event id). */
export const POST = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "event-register", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { eventRef: eventId } = parseParams(await context.params, eventIdParamsSchema);

  const registration = await registerForEvent(user, eventId);
  return created({ message: "You're registered. Your QR ticket has been emailed to you.", registration });
});

/** Cancel the signed-in user's registration. */
export const DELETE = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "event-register", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { eventRef: eventId } = parseParams(await context.params, eventIdParamsSchema);

  await cancelRegistration(user, eventId);
  return ok({ message: "Registration cancelled." });
});
