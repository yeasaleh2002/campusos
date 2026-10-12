import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { env } from "@/lib/env";
import { UnauthorizedError, withApiHandler } from "@/lib/errors";
import { bearerToken, secretsMatch } from "@/server/security/secret";
import { runMaintenance } from "@/server/services/maintenance.service";

/** Vercel function time budget (seconds). */
export const maxDuration = 60;

/** Daily cleanup of expired rate-limit windows and OTPs (Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`). */
export const GET = withApiHandler(async (request: NextRequest) => {
  if (!secretsMatch(bearerToken(request.headers.get("authorization")), env.CRON_SECRET)) throw new UnauthorizedError();
  return ok(await runMaintenance(), { headers: { "cache-control": "no-store" } });
});
