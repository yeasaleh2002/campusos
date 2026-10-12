import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { parseParams, slugSchema } from "@/lib/validation";
import { registrationBlocker, registrationClosesAt } from "@/server/domain/event-registration";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getPublicEventBySlug } from "@/server/queries/event.queries";

/** For GET the dynamic segment is the event slug. */
const paramsSchema = z.object({ eventRef: slugSchema });

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/events/[eventRef]">) => {
  await rateLimitPublicRead(request, "event");
  const { eventRef } = parseParams(await context.params, paramsSchema);
  const event = await getPublicEventBySlug(eventRef);
  if (!event) throw new NotFoundError("Event not found.");

  // Live (uncached) registration window, derived from the cached event data.
  const blocker = registrationBlocker(event, null, new Date());
  return ok({
    ...event,
    registration: { closesAt: registrationClosesAt(event), isOpen: blocker === null, blocker },
  });
});
