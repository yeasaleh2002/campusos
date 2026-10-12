import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getHelpdeskCategories } from "@/server/queries/helpdesk.queries";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "helpdesk-categories");
  return ok(await getHelpdeskCategories());
});
