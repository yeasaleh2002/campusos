import type { NextRequest } from "next/server";
import { created, paginated } from "@/lib/api-response";
import { ValidationError, withApiHandler } from "@/lib/errors";
import { decodeCursor, parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp, rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { getPublicResources, resourceCursorSchema } from "@/server/queries/resource.queries";
import { createResource } from "@/server/services/resource.service";
import { createResourceSchema, resourceListQuerySchema } from "@/server/validators/resource.validators";

/** List / search approved resources. */
export const GET = withApiHandler(async (request: NextRequest) => {
  const query = parseQuery(request, resourceListQuerySchema);
  if (query.cursor && !decodeCursor(query.cursor, resourceCursorSchema)) {
    throw new ValidationError(undefined, [{ path: "cursor", message: "Invalid cursor." }]);
  }
  // Free-text search is costlier than a filtered list, so it gets the search tier.
  if (query.q) await rateLimitByIp(request, "resource-search", RATE_LIMITS.search);
  else await rateLimitPublicRead(request, "resources");

  const page = await getPublicResources(query);
  return paginated(page.items, { limit: query.limit, nextCursor: page.nextCursor });
});

/** Submit a resource (PDF uploaded beforehand via /api/uploadthing). */
export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "resource-create", RATE_LIMITS.upload);
  const user = await requireAuth(request);
  const input = await parseJsonBody(request, createResourceSchema);

  const resource = await createResource(user, input);
  const message = resource.status === "APPROVED" ? "Resource published." : "Thanks! Your resource is waiting for moderator review.";
  return created({ message, resource });
});
