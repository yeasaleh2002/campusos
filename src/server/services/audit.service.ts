import type { Prisma } from "@/generated/prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getClientIp } from "@/server/security/ip";

export interface AuditActor {
  id: string;
}

export interface AuditEntity {
  type: string;
  id?: string | null;
}

/**
 * Records an admin/security action in AuditLog. Never throws - a failed audit
 * write is logged but must not fail the user's request.
 *
 * @example audit(user, "event.publish", { type: "Event", id }, { title }, request)
 */
export async function audit(
  actor: AuditActor | null,
  action: string,
  entity: AuditEntity,
  metadata?: Prisma.InputJsonObject,
  request?: Request,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        action,
        entityType: entity.type,
        entityId: entity.id ?? null,
        metadata,
        ip: request ? getClientIp(request) : null,
      },
      select: { id: true },
    });
  } catch (error) {
    logger.error("Audit log write failed", { action, entityType: entity.type, error });
  }
}
