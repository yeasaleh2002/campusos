import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { NotFoundError, ValidationError, withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { busServiceStatus, findStop, nextDepartures } from "@/server/domain/bus-schedule";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getCampusClosures } from "@/server/queries/calendar.queries";
import { getBusRoute } from "@/server/queries/campus.queries";
import { nextBusQuerySchema } from "@/server/validators/campus.validators";

/** Next departures for a route (optionally at a stop / in a direction), Asia/Dhaka and campus-calendar aware. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "bus-next");
  const query = parseQuery(request, nextBusQuerySchema);
  const route = await getBusRoute(query.route);
  if (!route) throw new NotFoundError("Bus route not found.");

  const stop = query.stop ? findStop(route.stops, query.stop) : null;
  if (query.stop && !stop) {
    throw new ValidationError(undefined, [{ path: "stop", message: `Unknown stop. Stops: ${route.stops.map((s) => s.name).join(", ")}` }]);
  }
  const now = new Date();
  const closures = await getCampusClosures(now);
  const options = { stop, direction: query.direction, closures };
  // On an off day or a suspended day `service` is false, `reason` says why, and `departures`
  // starts with the first trip of the next service day (never an empty or misleading list).
  const { service, reason, message, noMoreToday, nextService } = busServiceStatus(route.trips, route.stops, now, options);
  return ok({
    route: { code: route.code, name: route.name },
    stop: stop?.name ?? null,
    now,
    service,
    reason,
    message,
    noMoreToday,
    nextServiceAt: nextService?.at ?? null,
    departures: nextDepartures(route.trips, route.stops, now, { ...options, limit: query.limit }),
  });
});
