import type { NextRequest } from "next/server";
import { ok } from "@/lib/api-response";
import { env } from "@/lib/env";
import { UnauthorizedError, withApiHandler } from "@/lib/errors";
import { bearerToken, secretsMatch } from "@/server/security/secret";
import { sendEventReminders } from "@/server/services/platform.service";

/** Vercel function time budget (seconds). */
export const maxDuration = 60;

/**
 * Daily "events starting tomorrow" reminders. Vercel Cron calls this with
 * `Authorization: Bearer <CRON_SECRET>`. Idempotent - safe to call repeatedly.
 */
export const GET = withApiHandler(async (request: NextRequest) => {
  if (!secretsMatch(bearerToken(request.headers.get("authorization")), env.CRON_SECRET)) throw new UnauthorizedError();
  return ok(await sendEventReminders(), { headers: { "cache-control": "no-store" } });
});
