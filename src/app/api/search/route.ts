import { after, type NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { hourBucket } from "@/lib/time";
import { parseQuery } from "@/lib/validation";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { cleanText } from "@/server/chatbot/normalize";
import { globalSearch } from "@/server/queries/platform.queries";
import { logSearchTerm } from "@/server/services/platform.service";
import { globalSearchQuerySchema } from "@/server/validators/platform.validators";

/** Grouped search across events, resources, notices, helpdesk and lost & found. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "global-search", RATE_LIMITS.search);
  const { q, limit } = parseQuery(request, globalSearchQuerySchema);
  // Normalised query = cache key, so "DBMS" and "dbms?" share one cached result.
  const normalised = cleanText(q) || q;
  const results = await globalSearch(normalised, limit, hourBucket());
  after(() => logSearchTerm(normalised));
  return ok({ q: normalised, results });
});
