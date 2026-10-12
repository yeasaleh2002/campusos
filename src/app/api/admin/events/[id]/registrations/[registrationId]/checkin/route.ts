import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin } from "@/server/middleware/request-guards";
import { checkInManually } from "@/server/services/registration.service";
import { manualCheckInParamsSchema } from "@/server/validators/event.validators";

type Context = RouteContext<"/api/admin/events/[id]/registrations/[registrationId]/checkin">;

/** Manual check-in by registration id (no QR available). */
export const POST = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "checkin", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.EventsCheckIn);
  const { id, registrationId } = parseParams(await context.params, manualCheckInParamsSchema);
  return ok(await checkInManually(actor, id, registrationId, request));
});
