import { after, type NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { NotFoundError, withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import { getHelpdeskEntry } from "@/server/queries/helpdesk.queries";
import { recordEntryView } from "@/server/services/knowledge.service";

export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/helpdesk/entries/[id]">) => {
  await rateLimitPublicRead(request, "helpdesk-entry");
  const { id } = parseParams(await context.params, idParamsSchema);
  const entry = await getHelpdeskEntry(id);
  if (!entry) throw new NotFoundError("Entry not found.");
  // View counting never delays the (cached) response.
  after(() => recordEntryView(id));
  return ok(entry);
});
