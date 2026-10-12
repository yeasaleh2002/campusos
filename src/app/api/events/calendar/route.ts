import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getEventCalendar } from "@/server/queries/event.queries";
import { calendarQuerySchema } from "@/server/validators/event.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "calendar");
  const { month } = parseQuery(request, calendarQuerySchema);
  return ok({ month, events: await getEventCalendar(month) });
});
