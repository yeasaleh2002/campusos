import type { NextRequest } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { rateLimitPublicRead } from "@/server/middleware/rate-limit";
import packageJson from "../../../../package.json";

/** Uptime probe: DB round-trip + app version. Never cached, never leaks config. */
export const GET = withApiHandler(async (request: NextRequest) => {
  await rateLimitPublicRead(request, "health");
  const headers = { "cache-control": "no-store" };
  const started = performance.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    logger.error("Health check: database unreachable", { error });
    return fail(503, "DEGRADED", "Database unreachable.", undefined, headers);
  }
  return ok(
    {
      status: "ok",
      version: packageJson.version,
      db: { ok: true, latencyMs: Math.round(performance.now() - started) },
      uptimeSeconds: Math.round(process.uptime()),
      time: new Date(),
    },
    { headers },
  );
});
