import { cacheLife, cacheTag } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { decodeCursor, encodeCursor, type Page } from "@/lib/validation";
import {
  buildResourceSearchQuery,
  cursorFor,
  effectiveSort,
  type ResourceSearchParams,
  type ResourceSearchRow,
} from "@/server/search/resource-search";
import type { CourseListQuery } from "@/server/validators/academic.validators";

/** Shape of the opaque `cursor` used by GET /api/resources. */
export const resourceCursorSchema = z.object({ v: z.union([z.number(), z.string().max(40)]), id: z.string().max(40) });

export interface ResourceCard {
  id: string;
  title: string;
  description: string | null;
  type: ResourceSearchRow["type"];
  semester: number | null;
  year: number | null;
  tags: string[];
  fileSize: number;
  downloadCount: number;
  bookmarkCount: number;
  isSample: boolean;
  createdAt: Date;
  department: { id: string; code: string; name: string };
  course: { id: string; code: string; title: string } | null;
  /** Free-text course when it is not in the catalogue. */
  courseName: string | null;
  /** Relevance score (only meaningful for `sort=relevance` with a query). */
  score?: number;
}

function toCard(row: ResourceSearchRow, includeScore: boolean): ResourceCard {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    semester: row.semester,
    year: row.year,
    tags: row.tags,
    fileSize: row.fileSize,
    downloadCount: row.downloadCount,
    bookmarkCount: row.bookmarkCount,
    isSample: row.isSample,
    createdAt: row.createdAt,
    department: { id: row.departmentId, code: row.departmentCode, name: row.departmentName },
    course: row.courseId && row.courseCode && row.courseTitle ? { id: row.courseId, code: row.courseCode, title: row.courseTitle } : null,
    courseName: row.courseName,
    ...(includeScore ? { score: row.score } : {}),
  };
}

export type PublicResourceFilters = Omit<ResourceSearchParams, "cursor"> & { cursor?: string };

/** Approved resources: filtered list or ranked search (full-text + trigram), keyset-paginated. */
export async function getPublicResources(filters: PublicResourceFilters): Promise<Page<ResourceCard>> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.resources);

  const sort = effectiveSort(filters);
  const cursor = decodeCursor(filters.cursor, resourceCursorSchema);
  const rows = await prisma.$queryRaw<ResourceSearchRow[]>(buildResourceSearchQuery({ ...filters, sort, cursor }));

  const hasMore = rows.length > filters.limit;
  const items = hasMore ? rows.slice(0, filters.limit) : rows;
  return {
    items: items.map((row) => toCard(row, sort === "relevance")),
    nextCursor: hasMore ? encodeCursor({ ...cursorFor(sort, items[items.length - 1]) }) : null,
  };
}

const resourceDetailSelect = {
  id: true,
  title: true,
  description: true,
  type: true,
  semester: true,
  year: true,
  tags: true,
  fileSize: true,
  mimeType: true,
  downloadCount: true,
  bookmarkCount: true,
  isSample: true,
  createdAt: true,
  updatedAt: true,
  department: { select: { id: true, code: true, name: true } },
  course: { select: { id: true, code: true, title: true, semester: true } },
  courseName: true,
  uploadedBy: { select: { name: true } },
} satisfies Prisma.ResourceSelect;

export type ResourceDetail = Prisma.ResourceGetPayload<{ select: typeof resourceDetailSelect }>;

/**
 * Public resource page (approved only). The file URL is deliberately not part of
 * the payload - clients obtain it via POST /api/resources/{id}/download.
 */
export async function getPublicResourceById(id: string): Promise<ResourceDetail | null> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.resources, CacheTags.resource(id));

  const resource = await prisma.resource.findFirst({
    where: { id, status: "APPROVED", deletedAt: null },
    select: resourceDetailSelect,
  });
  if (resource) {
    cacheTag(CacheTags.department(resource.department.id), ...(resource.course ? [CacheTags.course(resource.course.id)] : []));
  }
  return resource;
}

/** All departments with course counts. */
export async function getDepartments() {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.departments);

  return prisma.department.findMany({
    select: { id: true, code: true, name: true, faculty: true, _count: { select: { courses: true } } },
    orderBy: { name: "asc" },
  });
}

/** Courses, optionally for one department / semester. */
export async function getCourses(filters: CourseListQuery) {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.courses, ...(filters.departmentId ? [CacheTags.department(filters.departmentId)] : []));

  return prisma.course.findMany({
    where: { departmentId: filters.departmentId, semester: filters.semester },
    select: { id: true, code: true, title: true, semester: true, credits: true, department: { select: { id: true, code: true } } },
    orderBy: [{ semester: "asc" }, { code: "asc" }],
    take: 500,
  });
}
