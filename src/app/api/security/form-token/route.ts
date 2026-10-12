import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { createFormToken, FORM_TOKEN_MAX_AGE_MS, FORM_TOKEN_MIN_AGE_MS } from "@/server/security/form-token";

export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "form-token");
  return ok(
    {
      formToken: createFormToken(),
      minAgeSeconds: FORM_TOKEN_MIN_AGE_MS / 1000,
      maxAgeSeconds: FORM_TOKEN_MAX_AGE_MS / 1000,
    },
    { headers: { "cache-control": "no-store" } },
  );
});
