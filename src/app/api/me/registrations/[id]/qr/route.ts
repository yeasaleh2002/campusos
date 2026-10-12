import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams, parseQuery } from "@/lib/validation";
import { requireAuth } from "@/server/middleware/auth";
import { getTicketQr } from "@/server/services/registration.service";
import { qrQuerySchema } from "@/server/validators/event.validators";

/** The owner's QR ticket: JSON with a data URL (default) or `?format=png`. */
export const GET = withApiHandler(async (request: NextRequest, context: RouteContext<"/api/me/registrations/[id]/qr">) => {
  const user = await requireAuth(request);
  const { id } = parseParams(await context.params, idParamsSchema);
  const { format } = parseQuery(request, qrQuerySchema);

  const ticket = await getTicketQr(user, id);
  if (format === "png") {
    return new Response(new Uint8Array(ticket.png), {
      headers: { "content-type": "image/png", "cache-control": "private, no-store", "content-disposition": 'inline; filename="campusos-ticket.png"' },
    });
  }
  return ok({ registrationId: id, status: ticket.status, qrDataUrl: ticket.dataUrl }, { headers: { "cache-control": "private, no-store" } });
});
