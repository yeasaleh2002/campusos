import type { NextRequest } from "next/server";
import { created } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { requireAuth } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createComplaint } from "@/server/services/complaint.service";
import { createComplaintSchema } from "@/server/validators/lost-found.validators";

/** File a complaint; returns a ticket like CU-2026-000123. */
export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "complaint-create", RATE_LIMITS.upload);
  const user = await requireAuth(request);
  const input = await parseJsonBody(request, createComplaintSchema);
  const complaint = await createComplaint(user, input);
  return created({ message: `Complaint received. Your ticket number is ${complaint.ticketNo}.`, complaint });
});
