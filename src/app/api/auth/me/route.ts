import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { getProfile } from "@/server/services/user.service";

export const GET = withApiHandler(async (request: NextRequest) => {
  const user = await requireAuth(request);
  return ok({ user: await getProfile(user.id) }, { headers: { "cache-control": "private, no-store" } });
});
