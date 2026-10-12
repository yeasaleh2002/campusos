import { revalidateAcademics } from "@/lib/cache-tags";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import type {
  CreateCourseInput,
  CreateDepartmentInput,
  UpdateCourseInput,
  UpdateDepartmentInput,
} from "@/server/validators/academic.validators";

const departmentSelect = { id: true, code: true, name: true, faculty: true, createdAt: true, updatedAt: true } as const;
const courseSelect = {
  id: true,
  code: true,
  title: true,
  semester: true,
  credits: true,
  departmentId: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Normalises "cse 2101" / "CSE2101" to the canonical "CSE-2101". */
export function canonicalCourseCode(code: string): string {
  const match = /^([A-Z]{2,5})[ -]?(\d{3,4}[A-Z]?)$/.exec(code.toUpperCase().trim());
  return match ? `${match[1]}-${match[2]}` : code.toUpperCase().trim();
}

/** Creates a department (codes are unique, upper-case). */
export async function createDepartment(actor: AuthUser, input: CreateDepartmentInput, request: Request) {
  const department = await prisma.department.create({ data: { ...input, faculty: input.faculty ?? null }, select: departmentSelect });
  await audit(actor, "department.create", { type: "Department", id: department.id }, { code: department.code }, request);
  revalidateAcademics({ departmentId: department.id });
  return department;
}

export async function updateDepartment(actor: AuthUser, id: string, input: UpdateDepartmentInput, request: Request) {
  const exists = await prisma.department.count({ where: { id } });
  if (!exists) throw new NotFoundError("Department not found.");
  const department = await prisma.department.update({ where: { id }, data: input, select: departmentSelect });
  await audit(actor, "department.update", { type: "Department", id }, { fields: Object.keys(input) }, request);
  revalidateAcademics({ departmentId: id });
  return department;
}

/** Deletes a department only when nothing references it. */
export async function deleteDepartment(actor: AuthUser, id: string, request: Request): Promise<void> {
  const department = await prisma.department.findUnique({
    where: { id },
    select: { code: true, _count: { select: { courses: true, resources: true, users: true, notices: true } } },
  });
  if (!department) throw new NotFoundError("Department not found.");
  const inUse = Object.entries(department._count).filter(([, count]) => count > 0).map(([name]) => name);
  if (inUse.length) throw new ConflictError(`Department is still referenced by: ${inUse.join(", ")}.`);

  await prisma.department.delete({ where: { id } });
  await audit(actor, "department.delete", { type: "Department", id }, { code: department.code }, request);
  revalidateAcademics({ departmentId: id });
}

async function assertDepartmentExists(departmentId: string): Promise<void> {
  const exists = await prisma.department.count({ where: { id: departmentId } });
  if (!exists) throw new ValidationError(undefined, [{ path: "departmentId", message: "Unknown department." }]);
}

/** Creates a course; the code is stored canonically (e.g. "CSE-2101"). */
export async function createCourse(actor: AuthUser, input: CreateCourseInput, request: Request) {
  await assertDepartmentExists(input.departmentId);
  const course = await prisma.course.create({
    data: { ...input, code: canonicalCourseCode(input.code), credits: input.credits ?? null },
    select: courseSelect,
  });
  await audit(actor, "course.create", { type: "Course", id: course.id }, { code: course.code }, request);
  revalidateAcademics({ courseId: course.id, departmentId: course.departmentId });
  return course;
}

export async function updateCourse(actor: AuthUser, id: string, input: UpdateCourseInput, request: Request) {
  const current = await prisma.course.findUnique({ where: { id }, select: { departmentId: true } });
  if (!current) throw new NotFoundError("Course not found.");
  if (input.departmentId) await assertDepartmentExists(input.departmentId);

  const course = await prisma.course.update({
    where: { id },
    data: { ...input, ...(input.code ? { code: canonicalCourseCode(input.code) } : {}) },
    select: courseSelect,
  });
  await audit(actor, "course.update", { type: "Course", id }, { fields: Object.keys(input) }, request);
  revalidateAcademics({ courseId: id, departmentId: current.departmentId });
  if (course.departmentId !== current.departmentId) revalidateAcademics({ departmentId: course.departmentId });
  return course;
}

/** Deletes a course only when no resources use it (notices are unlinked automatically). */
export async function deleteCourse(actor: AuthUser, id: string, request: Request): Promise<void> {
  const course = await prisma.course.findUnique({
    where: { id },
    select: { code: true, departmentId: true, _count: { select: { resources: true } } },
  });
  if (!course) throw new NotFoundError("Course not found.");
  if (course._count.resources > 0) throw new ConflictError("Course has resources. Move or delete them first.");

  await prisma.course.delete({ where: { id } });
  await audit(actor, "course.delete", { type: "Course", id }, { code: course.code }, request);
  revalidateAcademics({ courseId: id, departmentId: course.departmentId });
}
