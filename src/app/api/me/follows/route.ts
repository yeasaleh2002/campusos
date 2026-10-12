import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { listFollows } from "@/server/services/follow.service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  return ok(await listFollows(user), { headers: { "cache-control": "private, no-store" } });
});
