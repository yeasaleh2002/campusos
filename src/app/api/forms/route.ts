import type { NextRequest } from "next/server";
import { paginated } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { hourBucket } from "@/lib/time";
import { parseQuery } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getOpenForms } from "@/server/queries/campus.queries";
import { formListQuerySchema } from "@/server/validators/campus.validators";

/** Open forms (Google Forms etc.) with upcoming deadlines first. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "forms");
  const query = parseQuery(request, formListQuerySchema);
  const page = await getOpenForms(query, hourBucket());
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});
