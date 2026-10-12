import type { NextRequest } from "next/server";
import { BUS_SERVICE_DAYS, CAMPUS_TIME_ZONE, CAMPUS_WEEK_START, OFF_DAYS, WORKING_DAYS, getDhakaDateKey, statusOfDate, weekdayName } from "@/config/campus-calendar";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getCampusClosures } from "@/server/queries/calendar.queries";

/** Weekly rule plus upcoming special closures (Asia/Dhaka). Public; cached under the `calendar` tag. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "calendar");
  const now = new Date();
  const closures = await getCampusClosures(now);
  const today = statusOfDate(getDhakaDateKey(now), closures);
  return ok({
    timeZone: CAMPUS_TIME_ZONE,
    now,
    weeklyRule: {
      weekStart: weekdayName(CAMPUS_WEEK_START),
      workingDays: WORKING_DAYS.map(weekdayName),
      offDays: OFF_DAYS.map(weekdayName),
      busServiceDays: BUS_SERVICE_DAYS.map(weekdayName),
    },
    today: { dateKey: today.dateKey, weekday: weekdayName(today.weekday), campusOpen: today.open, busService: today.busService, campusReason: today.campusReason, busReason: today.busReason },
    closures,
  });
});
