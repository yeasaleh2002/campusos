import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { AppError } from "@/lib/errors";
import { audit } from "@/server/services/audit.service";
import { assertHuman, isHoneypotTriggered } from "@/server/middleware/bot-protection";
import { RATE_LIMITS, rateLimitByIp } from "@/server/middleware/rate-limit";
import { parseJsonBody } from "@/server/middleware/request-guards";
import { attachSessionCookie } from "@/server/middleware/session-cookie";
import { getClientIp } from "@/server/security/ip";
import { login } from "@/server/services/auth.service";
import { getProfile } from "@/server/services/user.service";
import { loginSchema } from "@/server/validators/auth.validators";

interface LoginRouteOptions {
  staffOnly: boolean;
}

/** Shared handler for POST /api/auth/login and POST /api/auth/admin/login. */
export async function handleLogin(request: NextRequest, options: LoginRouteOptions): Promise<Response> {
  const scope = options.staffOnly ? "admin-login" : "login";
  await rateLimitByIp(request, scope, RATE_LIMITS.authStrict);
  const body = await parseJsonBody(request, loginSchema);

  // Honeypot hit: same response as wrong credentials.
  if (isHoneypotTriggered(body)) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
  }
  const ip = getClientIp(request);
  await assertHuman(body, ip, { requireFormToken: false });

  const subject = await login(body, ip, options);
  if (options.staffOnly) {
    await audit(subject, "auth.admin_login", { type: "User", id: subject.id }, { role: subject.role }, request);
  }

  const response = ok({ message: "Signed in.", user: await getProfile(subject.id) });
  await attachSessionCookie(response, subject);
  return response;
}
