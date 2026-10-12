import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { listClaims } from "@/server/services/lost-found.service";

/** Claims on the item (reporter or moderator). */
export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/lost-found/[id]/claims">) => {
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  return ok(await listClaims(user, id), { headers: { "cache-control": "private, no-store" } });
});
