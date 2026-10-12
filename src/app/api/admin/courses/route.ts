import type { NextRequest } from "next/server";
import { created } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { createCourse } from "@/server/services/academic.service";
import { createCourseSchema } from "@/server/validators/academic.validators";

export const POST = withApiHandler(async (request: NextRequest) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.AcademicsManage);
  const input = await parseJsonBody(request, createCourseSchema);
  return created(await createCourse(actor, input, request));
});
