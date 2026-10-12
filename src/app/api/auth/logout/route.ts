import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { clearSessionCookie } from "@/server/middleware/session-cookie";

export const POST = withApiHandler(async (request: NextRequest) => {
  assertSameOrigin(request);
  const response = ok({ message: "Signed out." });
  clearSessionCookie(response);
  return response;
});
