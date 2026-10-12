import type { NextRequest } from "next/server";
import { created } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { importEntries } from "@/server/services/knowledge.service";
import { importEntriesSchema } from "@/server/validators/helpdesk.validators";

/** Vercel function time budget (seconds). */
export const maxDuration = 30;

/** Bulk JSON import - up to 500 entries per request (body limit 1 MB). */
const IMPORT_MAX_BYTES = 1024 * 1024;

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "kb-import", RATE_LIMITS.upload);
  const actor = await requirePermission(request, Permission.KnowledgeManage);
  const { entries, skipDuplicates } = await parseJsonBody(request, importEntriesSchema, IMPORT_MAX_BYTES);
  return created(await importEntries(actor, entries, skipDuplicates, request));
});
