import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getDepartments } from "@/server/queries/resource.queries";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "departments");
  return ok(await getDepartments());
});
