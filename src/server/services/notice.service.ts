import { after } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { can, Permission } from "@/lib/auth/rbac";
import { revalidateForms, revalidateKnowledgeBase, revalidateNotices } from "@/lib/cache-tags";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import { assertClubAccess, managedClubIds } from "@/server/services/club-access.service";
import { syncNoticeKnowledge } from "@/server/services/knowledge-sync.service";
import { notifyUsers } from "@/server/services/notification.service";
import { verifyUpload } from "@/server/services/upload.service";
import type { CreateFormInput, CreateNoticeInput, UpdateFormInput, UpdateNoticeInput } from "@/server/validators/campus.validators";

const FANOUT_BATCH = 1000;

const adminNoticeSelect = {
  id: true,
  title: true,
  body: true,
  category: true,
  pinned: true,
  expiresAt: true,
  attachmentUrl: true,
  departmentId: true,
  courseId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.NoticeSelect;

async function assertNoticeRefs(departmentId: string | null | undefined, courseId: string | null | undefined): Promise<void> {
  if (departmentId) {
    const exists = await prisma.department.count({ where: { id: departmentId } });
    if (!exists) throw new ValidationError(undefined, [{ path: "departmentId", message: "Unknown department." }]);
  }
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { departmentId: true } });
    if (!course) throw new ValidationError(undefined, [{ path: "courseId", message: "Unknown course." }]);
    if (departmentId && course.departmentId !== departmentId) {
      throw new ValidationError(undefined, [{ path: "courseId", message: "Course does not belong to this department." }]);
    }
  }
}

async function verifyAttachment(actor: AuthUser, url: string | null | undefined): Promise<void> {
  if (!url) return;
  await verifyUpload(url, { kind: ["PDF", "IMAGE"], field: "attachmentUrl", ownerId: can(actor, Permission.UsersManage) ? undefined : actor.id });
}

/**
 * Fans a notice out to affected users: students of the notice's department and
 * anyone following that department or course. Runs after the response, in
 * batches, so large departments don't slow the admin request. Global notices
 * (no department/course) are not fanned out - they appear on the board.
 */
async function countNoticeRecipients(notice: { departmentId: string | null; courseId: string | null; createdById: string }): Promise<number> {
  if (!notice.departmentId && !notice.courseId) return 0;
  const rows = await prisma.$queryRaw<Array<{ count: number }>>`
    SELECT count(*)::int AS count FROM "User" u
    WHERE u."isActive" AND u."deletedAt" IS NULL AND u.id <> ${notice.createdById}
      AND (
        (${notice.departmentId}::text IS NOT NULL AND u."departmentId" = ${notice.departmentId})
        OR EXISTS (
          SELECT 1 FROM "Follow" f WHERE f."userId" = u.id AND (
            (f."targetType" = 'DEPARTMENT' AND f."targetId" = ${notice.departmentId})
            OR (f."targetType" = 'COURSE' AND f."targetId" = ${notice.courseId})))
      )`;
  return rows[0]?.count ?? 0;
}

function fanOutNotice(notice: { id: string; title: string; category: string; departmentId: string | null; courseId: string | null; createdById: string }) {
  if (!notice.departmentId && !notice.courseId) return;
  after(async () => {
    let cursor = "";
    for (;;) {
      const batch = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT u.id FROM "User" u
        WHERE u."isActive" AND u."deletedAt" IS NULL AND u.id <> ${notice.createdById} AND u.id > ${cursor}
          AND (
            (${notice.departmentId}::text IS NOT NULL AND u."departmentId" = ${notice.departmentId})
            OR EXISTS (
              SELECT 1 FROM "Follow" f WHERE f."userId" = u.id AND (
                (f."targetType" = 'DEPARTMENT' AND f."targetId" = ${notice.departmentId})
                OR (f."targetType" = 'COURSE' AND f."targetId" = ${notice.courseId})))
          )
        ORDER BY u.id
        LIMIT ${FANOUT_BATCH}`;
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;
      await notifyUsers(batch.map((row) => row.id), {
        type: "NOTICE",
        title: notice.category === "URGENT" ? `Urgent: ${notice.title}` : notice.title,
        body: "A new notice was posted for you.",
        link: `/notices/${notice.id}`,
      });
      if (batch.length < FANOUT_BATCH) break;
    }
  });
}

/** Notices for the admin console, newest first (including expired). */
export async function listAdminNotices(query: { cursor?: string; limit: number }) {
  const rows = await prisma.notice.findMany({
    where: { deletedAt: null },
    select: adminNoticeSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

export async function createNotice(actor: AuthUser, input: CreateNoticeInput, request: Request) {
  await assertNoticeRefs(input.departmentId, input.courseId);
  await verifyAttachment(actor, input.attachmentUrl);
  const notice = await prisma.notice.create({
    data: {
      ...input,
      departmentId: input.departmentId ?? null,
      courseId: input.courseId ?? null,
      expiresAt: input.expiresAt ?? null,
      attachmentUrl: input.attachmentUrl ?? null,
      createdById: actor.id,
    },
    select: adminNoticeSelect,
  });
  await audit(actor, "notice.create", { type: "Notice", id: notice.id }, { category: notice.category }, request);
  await syncNoticeKnowledge(notice.id);
  revalidateNotices(notice.id);
  revalidateKnowledgeBase();
  fanOutNotice({ ...notice, createdById: actor.id });
  const recipients = await countNoticeRecipients({ ...notice, createdById: actor.id });
  return { ...notice, recipients };
}

async function findNotice(id: string) {
  const notice = await prisma.notice.findFirst({ where: { id, deletedAt: null }, select: { id: true, departmentId: true, courseId: true } });
  if (!notice) throw new NotFoundError("Notice not found.");
  return notice;
}

export async function updateNotice(actor: AuthUser, id: string, input: UpdateNoticeInput, request: Request) {
  const current = await findNotice(id);
  await assertNoticeRefs(
    input.departmentId === undefined ? current.departmentId : input.departmentId,
    input.courseId === undefined ? current.courseId : input.courseId,
  );
  await verifyAttachment(actor, input.attachmentUrl);
  const notice = await prisma.notice.update({ where: { id }, data: input, select: adminNoticeSelect });
  await audit(actor, "notice.update", { type: "Notice", id }, { fields: Object.keys(input) }, request);
  await syncNoticeKnowledge(id);
  revalidateNotices(id);
  revalidateKnowledgeBase();
  return notice;
}

export async function deleteNotice(actor: AuthUser, id: string, request: Request): Promise<void> {
  await findNotice(id);
  await prisma.notice.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  await audit(actor, "notice.delete", { type: "Notice", id }, undefined, request);
  await syncNoticeKnowledge(id);
  revalidateNotices(id);
  revalidateKnowledgeBase();
}

// ───────────── Forms ─────────────

const adminFormSelect = {
  id: true,
  title: true,
  description: true,
  url: true,
  deadline: true,
  isOpen: true,
  clubId: true,
  createdAt: true,
  updatedAt: true,
  club: { select: { name: true } },
} satisfies Prisma.FormLinkSelect;

export type AdminForm = Prisma.FormLinkGetPayload<{ select: typeof adminFormSelect }>;

/** CLUB_ADMINs must attach forms to one of their clubs; admins may post campus-wide forms. */
async function assertFormClub(actor: AuthUser, clubId: string | null | undefined): Promise<void> {
  if (clubId) {
    const club = await prisma.club.count({ where: { id: clubId, deletedAt: null } });
    if (!club) throw new ValidationError(undefined, [{ path: "clubId", message: "Unknown club." }]);
    await assertClubAccess(actor, clubId);
  } else if (actor.role === "CLUB_ADMIN") {
    throw new ValidationError(undefined, [{ path: "clubId", message: "Club admins must choose one of their clubs." }]);
  }
}

export async function listAdminForms(actor: AuthUser, query: { cursor?: string; limit: number }): Promise<Page<AdminForm>> {
  const scope = await managedClubIds(actor);
  const rows = await prisma.formLink.findMany({
    where: { deletedAt: null, ...(scope ? { clubId: { in: scope } } : {}) },
    select: adminFormSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

export async function createForm(actor: AuthUser, input: CreateFormInput, request: Request): Promise<AdminForm> {
  await assertFormClub(actor, input.clubId);
  const form = await prisma.formLink.create({
    data: { ...input, description: input.description ?? null, deadline: input.deadline ?? null, clubId: input.clubId ?? null, createdById: actor.id },
    select: adminFormSelect,
  });
  await audit(actor, "form.create", { type: "FormLink", id: form.id }, { title: form.title }, request);
  revalidateForms();
  return form;
}

async function findManagedForm(actor: AuthUser, id: string) {
  const form = await prisma.formLink.findFirst({ where: { id, deletedAt: null }, select: { id: true, clubId: true } });
  if (!form) throw new NotFoundError("Form not found.");
  await assertFormClub(actor, form.clubId);
  return form;
}

export async function updateForm(actor: AuthUser, id: string, input: UpdateFormInput, request: Request): Promise<AdminForm> {
  await findManagedForm(actor, id);
  if (input.clubId !== undefined) await assertFormClub(actor, input.clubId);
  const form = await prisma.formLink.update({ where: { id }, data: input, select: adminFormSelect });
  await audit(actor, "form.update", { type: "FormLink", id }, { fields: Object.keys(input) }, request);
  revalidateForms();
  return form;
}

export async function deleteForm(actor: AuthUser, id: string, request: Request): Promise<void> {
  await findManagedForm(actor, id);
  await prisma.formLink.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  await audit(actor, "form.delete", { type: "FormLink", id }, undefined, request);
  revalidateForms();
}
