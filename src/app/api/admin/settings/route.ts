import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { readSiteSettings } from "@/server/queries/settings.queries";
import { updateSiteSettings } from "@/server/services/settings.service";
import { updateSiteSettingsSchema } from "@/server/validators/settings.validators";

export const GET = withApiHandler(async (request: NextRequest) => {
  await requirePermission(request, Permission.SettingsManage);
  return ok(await readSiteSettings(), { headers: { "cache-control": "private, no-store" } });
});

export const PATCH = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.SettingsManage);
  const input = await parseJsonBody(request, updateSiteSettingsSchema);
  return ok(await updateSiteSettings(actor, input, request));
});
