import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getBusRoutes } from "@/server/queries/campus.queries";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "bus-routes");
  return ok(await getBusRoutes());
});
