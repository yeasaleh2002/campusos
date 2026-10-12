import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const HOUR_MS = 3600 * 1000;

export interface MaintenanceReport {
  rateLimits: number;
  otps: number;
}

/**
 * Housekeeping for tables that only ever grow: expired rate-limit windows and
 * long-dead OTPs. Idempotent and index-bounded (resetAt / expiresAt), safe to run daily.
 */
export async function runMaintenance(now: Date = new Date()): Promise<MaintenanceReport> {
  const [rateLimits, otps] = await Promise.all([
    prisma.rateLimit.deleteMany({ where: { resetAt: { lt: new Date(now.getTime() - HOUR_MS) } } }),
    prisma.emailOtp.deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * HOUR_MS) } } }),
  ]);
  const report = { rateLimits: rateLimits.count, otps: otps.count };
  logger.info("Maintenance completed", { ...report });
  return report;
}
