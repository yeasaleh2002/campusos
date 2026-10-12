import type { NotificationType } from "@/generated/prisma/enums";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { toPage } from "@/lib/validation";

const INSERT_CHUNK = 1000;

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/** Creates the same in-app notification for many users, in chunks of 1000 rows. */
export async function notifyUsers(userIds: readonly string[], notification: NotificationInput): Promise<number> {
  const unique = [...new Set(userIds)];
  for (let offset = 0; offset < unique.length; offset += INSERT_CHUNK) {
    await prisma.notification.createMany({
      data: unique.slice(offset, offset + INSERT_CHUNK).map((userId) => ({ userId, ...notification })),
    });
  }
  return unique.length;
}

const notificationSelect = { id: true, type: true, title: true, body: true, link: true, readAt: true, createdAt: true } as const;

/** The user's notifications, newest first (uses the (userId, readAt, createdAt) index). */
export async function listNotifications(userId: string, query: { unreadOnly?: boolean; cursor?: string; limit: number }) {
  const rows = await prisma.notification.findMany({
    where: { userId, ...(query.unreadOnly ? { readAt: null } : {}) },
    select: notificationSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

export function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

/** Marks one of the user's notifications read (idempotent). */
export async function markRead(userId: string, id: string): Promise<void> {
  const exists = await prisma.notification.count({ where: { id, userId } });
  if (!exists) throw new NotFoundError("Notification not found.");
  await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
  return result.count;
}
