import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { Permission } from "@/lib/auth/rbac";
import { withApiHandler } from "@/lib/errors";
import { idParamsSchema, parseParams } from "@/lib/validation";
import { requirePermission } from "@/server/middleware/auth";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { assertSameOrigin, parseJsonBody } from "@/server/middleware/request-guards";
import { deleteCourse, updateCourse } from "@/server/services/academic.service";
import { updateCourseSchema } from "@/server/validators/academic.validators";

type Context = RouteContext<"/api/admin/courses/[id]">;

export const PATCH = withApiHandler(async (request: NextRequest, context: Context) => {
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.AcademicsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  const input = await parseJsonBody(request, updateCourseSchema);
  return ok(await updateCourse(actor, id, input, request));
});

export const DELETE = withApiHandler(async (request: NextRequest, context: Context) => {
  assertSameOrigin(request);
  await rateLimitByIp(request, "admin-write", RATE_LIMITS.write);
  const actor = await requirePermission(request, Permission.AcademicsManage);
  const { id } = parseParams(await context.params, idParamsSchema);
  await deleteCourse(actor, id, request);
  return ok({ message: "Course deleted.", id });
});
