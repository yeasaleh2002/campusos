import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getNotice } from "@/server/queries/campus.queries";

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/notices/[id]">) => {
  await rateLimitPublicRead(request, "notice");
  const { id } = parseParams(await context.params, idParamsSchema);
  const notice = await getNotice(id);
  if (!notice) throw new NotFoundError("Notice not found.");
  return ok(notice);
});
