import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { requirePermission } from "@/server/middleware/auth";
import { rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { checkInByQr } from "@/server/services/registration.service";
import { checkInSchema } from "@/server/validators/event.validators";

/** Door scanners fire in bursts, so check-in gets a higher per-IP budget than other writes. */
const CHECKIN_LIMIT = { limit: 240, windowMs: 60 * 1000 };

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "checkin", CHECKIN_LIMIT);
  const actor = await requirePermission(request, Permission.EventsCheckIn);
  const input = await parseJsonBody(request, checkInSchema);
  return ok(await checkInByQr(actor, input, request));
});
