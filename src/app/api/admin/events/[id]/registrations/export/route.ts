import type { NextRequest } from "next/server";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import { exportRegistrationsCsv } from "@/server/services/registration.service";

/** Vercel function time budget (seconds). */
export const maxDuration = 60;

/** Streams all registrations as CSV (UTF-8 with BOM for Excel). */
export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/admin/events/[id]/registrations/export">) => {
  const actor = await requirePermission(request, Permission.EventsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const stream = await exportRegistrationsCsv(actor, id);
  await audit(actor, "event.registrations_export", { type: "Event", id }, undefined, request);

  return new Response(stream, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="registrations-${id}.csv"`,
      "cache-control": "private, no-store",
    },
  });
});
