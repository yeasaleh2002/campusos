import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseQuery } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getCourses } from "@/server/queries/resource.queries";
import { courseListQuerySchema } from "@/server/validators/academic.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "courses");
  return ok(await getCourses(parseQuery(request, courseListQuerySchema)));
});
