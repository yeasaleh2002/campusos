import { addDaysToDateKey, dhakaInstant, getDhakaDateKey } from "@/config/campus-calendar";
import type { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { can, Permission } from "@/lib/auth/rbac";
import { CacheTags, revalidateTags } from "@/lib/cache-tags";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import { cleanText } from "@/server/chatbot/normalize";
import { eventReminderEmail } from "@/server/email/templates";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import { type EmailRecipient, sendBulkEmail } from "@/server/services/email.service";
import { notifyUsers } from "@/server/services/notification.service";
import type { AdminUserListQuery, AuditLogQuery, UpdateUserInput } from "@/server/validators/platform.validators";

// ───────────── Search analytics ─────────────

/** Counts a normalised search term (one upsert; called after the response). */
export async function logSearchTerm(q: string): Promise<void> {
  const term = cleanText(q).slice(0, 100);
  if (term.length < 2) return;
  await prisma.searchTerm.upsert({
    where: { term },
    create: { term },
    update: { count: { increment: 1 }, lastSearchedAt: new Date() },
    select: { term: true },
  });
}

// ───────────── Event reminders (cron) ─────────────

const REMINDER_BATCH = 1000;

/** UTC range of "tomorrow" in Asia/Dhaka. */
export function dhakaTomorrow(now: Date): { start: Date; end: Date } {
  const today = getDhakaDateKey(now);
  return { start: dhakaInstant(addDaysToDateKey(today, 1)), end: dhakaInstant(addDaysToDateKey(today, 2)) };
}

export interface ReminderReport {
  events: number;
  notified: number;
  emailed: number;
}

/**
 * Sends "starts tomorrow" reminders (in-app + bulk email) to registrants of
 * published events that start tomorrow (Dhaka). Idempotent: each event is
 * claimed with `reminderSentAt` before sending, so overlapping cron runs and
 * retries never double-send.
 *
 * Campus calendar: this cron only sends EVENT reminders, which go out normally even when the
 * event falls on an off day (the organiser confirmed it). It never sends "class tomorrow" or
 * "bus tomorrow" reminders, so nothing is announced for Wednesday or Thursday.
 */
export async function sendEventReminders(now: Date = new Date()): Promise<ReminderReport> {
  const { start, end } = dhakaTomorrow(now);
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED", deletedAt: null, reminderSentAt: null, startAt: { gte: start, lt: end } },
    select: { id: true, title: true, slug: true, startAt: true, venue: true },
  });

  const report: ReminderReport = { events: 0, notified: 0, emailed: 0 };
  for (const event of events) {
    const claimed = await prisma.event.updateMany({ where: { id: event.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claimed.count === 0) continue;
    report.events++;

    const email = eventReminderEmail({ eventTitle: event.title, eventSlug: event.slug, startAt: event.startAt, venue: event.venue });
    let cursor: string | undefined;
    for (;;) {
      const batch = await prisma.eventRegistration.findMany({
        where: { eventId: event.id, status: "REGISTERED" },
        select: { id: true, user: { select: { id: true, name: true, email: true } } },
        orderBy: { id: "asc" },
        take: REMINDER_BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;
      report.notified += await notifyUsers(batch.map((r) => r.user.id), { type: "EVENT", title: `Tomorrow: ${event.title}`, body: `Starts tomorrow at ${event.venue}.`, link: `/events/${event.slug}` });
      const recipients: EmailRecipient[] = batch.map((r) => ({ email: r.user.email, name: r.user.name }));
      report.emailed += await sendBulkEmail(recipients, email, "event-reminder");
      if (batch.length < REMINDER_BATCH) break;
    }
  }
  logger.info("Event reminders processed", { ...report });
  return report;
}

// ───────────── User management ─────────────

const adminUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  studentId: true,
  batch: true,
  isActive: true,
  isEmailVerified: true,
  lastLoginAt: true,
  createdAt: true,
  department: { select: { code: true } },
} satisfies Prisma.UserSelect;

export type AdminUser = Prisma.UserGetPayload<{ select: typeof adminUserSelect }>;

const PRIVILEGED_ROLES: readonly Role[] = ["ADMIN", "SUPER_ADMIN"];

export async function listUsers(query: AdminUserListQuery): Promise<Page<AdminUser>> {
  const rows = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: query.role,
      isActive: query.isActive,
      ...(query.q ? { OR: [{ name: { contains: query.q, mode: "insensitive" } }, { email: { contains: query.q, mode: "insensitive" } }, { studentId: { contains: query.q, mode: "insensitive" } }] } : {}),
    },
    select: adminUserSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

/**
 * Guards for acting on another account: never on yourself, and only a
 * SUPER_ADMIN may touch or create ADMIN/SUPER_ADMIN accounts.
 */
async function loadManageableUser(actor: AuthUser, targetId: string, newRole?: Role) {
  if (targetId === actor.id) throw new ForbiddenError("You can't change your own account here.");
  const target = await prisma.user.findFirst({ where: { id: targetId, deletedAt: null }, select: { id: true, role: true, email: true } });
  if (!target) throw new NotFoundError("User not found.");
  const touchesPrivileged = PRIVILEGED_ROLES.includes(target.role) || (newRole !== undefined && PRIVILEGED_ROLES.includes(newRole));
  if (touchesPrivileged && !can(actor, Permission.RolesManage)) {
    throw new ForbiddenError("Only a super admin can manage admin accounts.");
  }
  return target;
}

/** Changes role and/or activation. Both revoke the user's sessions (tokenVersion++). */
export async function updateUser(actor: AuthUser, targetId: string, input: UpdateUserInput, request: Request): Promise<AdminUser> {
  const target = await loadManageableUser(actor, targetId, input.role);
  if (input.role === target.role && input.isActive === undefined) {
    throw new ValidationError(undefined, [{ path: "role", message: "User already has this role." }]);
  }
  const user = await prisma.user.update({
    where: { id: targetId },
    data: { role: input.role, isActive: input.isActive, tokenVersion: { increment: 1 } },
    select: adminUserSelect,
  });
  await audit(actor, "user.update", { type: "User", id: targetId }, { fromRole: target.role, toRole: input.role ?? null, isActive: input.isActive ?? null }, request);
  revalidateTags(CacheTags.stats);
  return user;
}

/** Signs the user out everywhere by bumping tokenVersion. */
export async function forceLogout(actor: AuthUser, targetId: string, request: Request): Promise<void> {
  await loadManageableUser(actor, targetId);
  await prisma.user.update({ where: { id: targetId }, data: { tokenVersion: { increment: 1 } }, select: { id: true } });
  await audit(actor, "user.force_logout", { type: "User", id: targetId }, undefined, request);
}

export async function listAuditLogs(query: AuditLogQuery) {
  const rows = await prisma.auditLog.findMany({
    where: { action: query.action, entityType: query.entityType, entityId: query.entityId, actorId: query.actorId },
    select: { id: true, action: true, entityType: true, entityId: true, metadata: true, ip: true, createdAt: true, actor: { select: { id: true, name: true, role: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

// ───────────── Manual revalidation allowlist ─────────────

const STATIC_TAGS = new Set<string>([
  CacheTags.events, CacheTags.calendar, CacheTags.clubs, CacheTags.forms, CacheTags.resources, CacheTags.departments,
  CacheTags.courses, CacheTags.notices, CacheTags.buses, CacheTags.kb, CacheTags.lostFound, CacheTags.stats,
]);
const DYNAMIC_TAG = /^(event|club|resource|department|course|notice|bus|kb|lf):c[a-z0-9]{20,32}$/;

/** Splits requested tags into allowed and rejected (only known tag shapes may be revalidated). */
export function partitionTags(tags: string[]): { allowed: string[]; rejected: string[] } {
  const allowed = tags.filter((tag) => STATIC_TAGS.has(tag) || DYNAMIC_TAG.test(tag));
  return { allowed: [...new Set(allowed)], rejected: tags.filter((tag) => !allowed.includes(tag)) };
}
