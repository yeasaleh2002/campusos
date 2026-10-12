import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseParams, parseQuery } from "@/lib/validation";
import { getAuthUser } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { trackComplaint } from "@/server/services/complaint.service";
import { ticketNoSchema, trackQuerySchema } from "@/server/validators/lost-found.validators";

const paramsSchema = z.object({ ticketNo: ticketNoSchema });

/**
 * Track a ticket: signed-in owner gets the full view; otherwise `?email=` must
 * match the complainant's email for a limited status view. Anything else = 404.
 */
export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/complaints/track/[ticketNo]">) => {
  await rateLimitByIp(request, "ticket-track", RATE_LIMITS.ticketTrack);
  const { ticketNo } = parseParams(await context.params, paramsSchema);
  const { email } = parseQuery(request, trackQuerySchema);
  const user = await getAuthUser(request);
  return ok(await trackComplaint(ticketNo, user, email), { headers: { "cache-control": "private, no-store" } });
});
