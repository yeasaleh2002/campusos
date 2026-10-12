import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { revalidateTags } from "@/lib/cache-tags";
import { env } from "@/lib/env";
import { UnauthorizedError, ValidationError, withApiHandler } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { secretsMatch } from "@/server/security/secret";
import { partitionTags } from "@/server/services/platform.service";
import { revalidateSchema } from "@/server/validators/platform.validators";

/**
 * Manual cache revalidation for ops (server-to-server, so no Origin check).
 * Requires `x-revalidate-secret: <REVALIDATE_SECRET>`; only allow-listed tags.
 */
export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "revalidate", RATE_LIMITS.authStrict);
  if (!secretsMatch(request.headers.get("x-revalidate-secret"), env.REVALIDATE_SECRET)) throw new UnauthorizedError();
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ValidationError("Content-Type must be application/json.");

  const { tags } = revalidateSchema.parse(await request.json());
  const { allowed, rejected } = partitionTags(tags);
  if (allowed.length === 0) throw new ValidationError(undefined, [{ path: "tags", message: "No allow-listed tags." }]);
  revalidateTags(...allowed);
  logger.info("Manual revalidation", { tags: allowed });
  return ok({ revalidated: allowed, rejected });
});
