import type { Prisma } from "@/generated/prisma/client";
import type { ModerationStatus } from "@/generated/prisma/enums";
import { isStaff } from "@/lib/auth/rbac";
import { revalidateResourceDetail, revalidateResources } from "@/lib/cache-tags";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import { resourceReviewedEmail } from "@/server/email/templates";
import type { AuthUser } from "@/server/middleware/auth";
import { dbRateLimitStore } from "@/server/middleware/rate-limit";
import { consume } from "@/server/security/rate-limiter";
import { audit } from "@/server/services/audit.service";
import { sendEmailAfterResponse } from "@/server/services/email.service";
import { notifyUsers } from "@/server/services/notification.service";
import { verifyUpload } from "@/server/services/upload.service";
import type {
  AdminResourceListQuery,
  CreateResourceInput,
  ReviewResourceInput,
  UpdateResourceInput,
} from "@/server/validators/resource.validators";

/** A user's repeat downloads of the same file within this window count once. */
const DOWNLOAD_DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

const ownResourceSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  rejectionReason: true,
  reviewedAt: true,
  downloadCount: true,
  createdAt: true,
  department: { select: { code: true } },
  course: { select: { code: true } },
} satisfies Prisma.ResourceSelect;

const moderationSelect = {
  ...ownResourceSelect,
  description: true,
  semester: true,
  year: true,
  tags: true,
  fileUrl: true,
  fileSize: true,
  mimeType: true,
  isSample: true,
  courseId: true,
  departmentId: true,
  uploadedBy: { select: { id: true, name: true, email: true, studentId: true } },
} satisfies Prisma.ResourceSelect;

export type OwnResource = Prisma.ResourceGetPayload<{ select: typeof ownResourceSelect }>;
export type ModerationResource = Prisma.ResourceGetPayload<{ select: typeof moderationSelect }>;

/** Ensures the department exists and, if given, the course belongs to it. */
async function assertAcademicRefs(departmentId: string, courseId: string | null | undefined): Promise<void> {
  const [department, course] = await Promise.all([
    prisma.department.findUnique({ where: { id: departmentId }, select: { id: true } }),
    courseId ? prisma.course.findUnique({ where: { id: courseId }, select: { departmentId: true } }) : null,
  ]);
  if (!department) throw new ValidationError(undefined, [{ path: "departmentId", message: "Unknown department." }]);
  if (courseId && course?.departmentId !== departmentId) {
    throw new ValidationError(undefined, [{ path: "courseId", message: "Course does not belong to this department." }]);
  }
}

/** A custom course is also added as a tag (tags are weighted in search) so the resource stays findable by it. */
function withCourseTag(tags: string[], courseName: string | null | undefined): string[] {
  const tag = courseName?.toLowerCase().slice(0, 30).trim();
  if (!tag || !/^[\p{L}\p{N} +#.-]+$/u.test(tag)) return tags;
  return [...new Set([...tags, tag])].slice(0, 10);
}

/**
 * Creates a resource from a PDF the user uploaded via the FileRouter. The key
 * must be tracked in UploadedFile, owned by the user, and its recorded size/type
 * must match. Students' uploads wait for moderation; staff uploads go live.
 */
export async function createResource(user: AuthUser, input: CreateResourceInput): Promise<OwnResource> {
  await assertAcademicRefs(input.departmentId, input.courseId);
  const upload = await verifyUpload(input.fileUrl, { kind: "PDF", ownerId: user.id, field: "fileUrl" }, input.fileKey);
  if (upload.size !== input.fileSize || upload.mimeType !== input.mimeType) {
    throw new ValidationError(undefined, [{ path: "fileSize", message: "File details do not match the upload." }]);
  }
  const alreadyUsed = await prisma.resource.count({ where: { fileKey: upload.key } });
  if (alreadyUsed) throw new ConflictError("This file is already attached to a resource.");

  const autoApprove = isStaff(user);
  const now = new Date();
  const resource = await prisma.resource.create({
    data: {
      title: input.title,
      description: input.description ?? null,
      type: input.type,
      courseId: input.courseId ?? null,
      courseName: input.courseName ?? null,
      departmentId: input.departmentId,
      semester: input.semester ?? null,
      year: input.year ?? null,
      tags: withCourseTag(input.tags, input.courseName),
      fileUrl: upload.url,
      fileKey: upload.key,
      fileSize: upload.size,
      mimeType: upload.mimeType,
      uploadedById: user.id,
      status: autoApprove ? "APPROVED" : "PENDING",
      ...(autoApprove ? { reviewedById: user.id, reviewedAt: now } : {}),
    },
    select: ownResourceSelect,
  });

  if (autoApprove) revalidateResources(resource.id, { courseId: input.courseId, departmentId: input.departmentId });
  return resource;
}

/**
 * Returns the file URL and counts the download (once per user per 24h, so
 * refreshes cannot inflate popularity).
 */
export async function recordDownload(user: AuthUser, resourceId: string): Promise<{ fileUrl: string; downloadCount: number }> {
  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, status: "APPROVED", deletedAt: null },
    select: { fileUrl: true, downloadCount: true },
  });
  if (!resource) throw new NotFoundError("Resource not found.");

  const first = await consume(dbRateLimitStore, `dl:${resourceId}:${user.id}`, { limit: 1, windowMs: DOWNLOAD_DEDUPE_WINDOW_MS });
  if (!first.allowed) return { fileUrl: resource.fileUrl, downloadCount: resource.downloadCount };

  const updated = await prisma.resource.update({
    where: { id: resourceId },
    data: { downloadCount: { increment: 1 } },
    select: { downloadCount: true },
  });
  revalidateResourceDetail(resourceId);
  return { fileUrl: resource.fileUrl, downloadCount: updated.downloadCount };
}

/** Bookmarks a resource; the counter only moves when a row is actually created. */
export async function bookmarkResource(user: AuthUser, resourceId: string): Promise<void> {
  const exists = await prisma.resource.count({ where: { id: resourceId, status: "APPROVED", deletedAt: null } });
  if (!exists) throw new NotFoundError("Resource not found.");

  await prisma.$transaction(async (tx) => {
    const created = await tx.resourceBookmark.createMany({ data: [{ userId: user.id, resourceId }], skipDuplicates: true });
    if (created.count === 1) {
      await tx.resource.update({ where: { id: resourceId }, data: { bookmarkCount: { increment: 1 } }, select: { id: true } });
    }
  });
  revalidateResourceDetail(resourceId);
}

/** Removes a bookmark; idempotent. */
export async function unbookmarkResource(user: AuthUser, resourceId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const removed = await tx.resourceBookmark.deleteMany({ where: { userId: user.id, resourceId } });
    if (removed.count === 1) {
      await tx.$executeRaw`UPDATE "Resource" SET "bookmarkCount" = GREATEST("bookmarkCount" - 1, 0) WHERE id = ${resourceId}`;
    }
  });
  revalidateResourceDetail(resourceId);
}

const bookmarkSelect = {
  id: true,
  createdAt: true,
  resource: {
    select: {
      id: true,
      title: true,
      type: true,
      semester: true,
      year: true,
      downloadCount: true,
      department: { select: { code: true } },
      course: { select: { code: true, title: true } },
    },
  },
} satisfies Prisma.ResourceBookmarkSelect;

/** The user's bookmarked (still approved) resources, newest first. */
export async function listBookmarks(user: AuthUser, query: { cursor?: string; limit: number }) {
  const rows = await prisma.resourceBookmark.findMany({
    where: { userId: user.id, resource: { status: "APPROVED", deletedAt: null } },
    select: bookmarkSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

/** The user's own uploads with their moderation status. */
export async function listMyResources(user: AuthUser, query: { status?: ModerationStatus; cursor?: string; limit: number }): Promise<Page<OwnResource>> {
  const rows = await prisma.resource.findMany({
    where: { uploadedById: user.id, deletedAt: null, status: query.status },
    select: ownResourceSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

// ───────────── Moderation ─────────────

/** Moderation queue (default: PENDING, oldest first so nothing starves). */
export async function listModerationQueue(query: AdminResourceListQuery): Promise<Page<ModerationResource>> {
  const rows = await prisma.resource.findMany({
    where: {
      deletedAt: null,
      status: query.status,
      departmentId: query.departmentId,
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" } } : {}),
    },
    select: moderationSelect,
    orderBy: [{ createdAt: query.status === "PENDING" ? "asc" : "desc" }, { id: "asc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

async function findActiveResource(id: string) {
  const resource = await prisma.resource.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, title: true, status: true, courseId: true, departmentId: true, uploadedBy: { select: { id: true, name: true, email: true } } },
  });
  if (!resource) throw new NotFoundError("Resource not found.");
  return resource;
}

/** Approves or rejects a pending resource and notifies the uploader. */
export async function reviewResource(actor: AuthUser, resourceId: string, input: ReviewResourceInput, request: Request): Promise<ModerationResource> {
  const resource = await findActiveResource(resourceId);
  if (resource.status !== "PENDING") throw new ConflictError("Only pending resources can be reviewed.");

  const approved = input.decision === "APPROVE";
  const reason = input.reason ?? null;
  const updated = await prisma.resource.update({
    where: { id: resourceId },
    data: { status: approved ? "APPROVED" : "REJECTED", reviewedById: actor.id, reviewedAt: new Date(), rejectionReason: approved ? null : reason },
    select: moderationSelect,
  });

  await audit(actor, approved ? "resource.approve" : "resource.reject", { type: "Resource", id: resourceId }, { reason }, request);
  await notifyUsers([resource.uploadedBy.id], {
    type: "RESOURCE",
    title: approved ? `Approved: ${resource.title}` : `Not approved: ${resource.title}`,
    body: approved ? "Your resource is now live in the Resource Hub." : (reason ?? "Your resource was not approved."),
    link: approved ? `/resources/${resourceId}` : "/my/resources",
  });
  sendEmailAfterResponse(
    { email: resource.uploadedBy.email, name: resource.uploadedBy.name },
    () => resourceReviewedEmail({ name: resource.uploadedBy.name, resourceTitle: resource.title, approved, reason, resourceId }),
    "resource-reviewed",
  );
  revalidateResources(resourceId, resource);
  return updated;
}

/** Moderator edit of resource metadata. */
export async function updateResource(actor: AuthUser, resourceId: string, input: UpdateResourceInput, request: Request): Promise<ModerationResource> {
  const resource = await findActiveResource(resourceId);
  const departmentId = input.departmentId ?? resource.departmentId;
  const courseId = input.courseId === undefined ? resource.courseId : input.courseId;
  if (input.departmentId !== undefined || input.courseId !== undefined) await assertAcademicRefs(departmentId, courseId);

  const updated = await prisma.resource.update({ where: { id: resourceId }, data: input, select: moderationSelect });
  await audit(actor, "resource.update", { type: "Resource", id: resourceId }, { fields: Object.keys(input) }, request);
  // Old and new course/department pages may both list it.
  revalidateResources(resourceId, resource);
  revalidateResources(resourceId, updated);
  return updated;
}

/** Soft-deletes a resource (file kept for audit; the key stays reserved). */
export async function deleteResource(actor: AuthUser, resourceId: string, request: Request): Promise<void> {
  const resource = await findActiveResource(resourceId);
  await prisma.resource.update({ where: { id: resourceId }, data: { deletedAt: new Date() }, select: { id: true } });
  await audit(actor, "resource.delete", { type: "Resource", id: resourceId }, { title: resource.title }, request);
  revalidateResources(resourceId, resource);
}

export interface BulkReviewResult {
  succeeded: string[];
  failed: Array<{ id: string; message: string }>;
}

/**
 * Applies one decision to many resources. Each item is processed on its own so one
 * stale or missing row never blocks the rest (and each gets its own audit entry).
 */
export async function bulkReviewResources(actor: AuthUser, ids: string[], input: ReviewResourceInput, request: Request): Promise<BulkReviewResult> {
  const result: BulkReviewResult = { succeeded: [], failed: [] };
  for (const id of ids) {
    try {
      await reviewResource(actor, id, input, request);
      result.succeeded.push(id);
    } catch (error) {
      result.failed.push({ id, message: error instanceof Error ? error.message : "Could not review this resource." });
    }
  }
  return result;
}
