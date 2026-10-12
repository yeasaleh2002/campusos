import type { NextRequest } from "next/server";
import { z } from "zod";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { parseParams } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { deleteUpload } from "@/server/services/upload.service";

// Runs on the Node.js runtime (Next 16 default; `export const runtime` is disallowed with Cache Components).

const paramsSchema = z.object({ key: z.string().regex(/^[A-Za-z0-9_.-]{8,128}$/, "Invalid key.") });

export const DELETE = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/upload/[key]">) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "upload-delete", RATE_LIMITS.write);
  const user = await requireAuth(request);
  const { key } = parseParams(await context.params, paramsSchema);

  await deleteUpload(user, key);
  return ok({ message: "File deleted.", key });
});
