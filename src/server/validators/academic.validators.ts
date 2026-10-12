import { z } from "zod";
import { idSchema } from "@/lib/validation";

const departmentCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2,16}$/, "Use 2-16 letters, e.g. CSE.");
/** Course codes like "CSE-2101", "EEE 1101", "BBA101". */
const courseCode = z.string().trim().toUpperCase().regex(/^[A-Z]{2,5}[ -]?\d{3,4}[A-Z]?$/, "Use a code like CSE-2101.");

export const createDepartmentSchema = z
  .object({
    code: departmentCode,
    name: z.string().trim().min(2).max(120),
    faculty: z.string().trim().min(2).max(120).nullable().optional(),
  })
  .strict();

export const updateDepartmentSchema = createDepartmentSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const createCourseSchema = z
  .object({
    code: courseCode,
    title: z.string().trim().min(2).max(200),
    departmentId: idSchema,
    semester: z.number().int().min(1).max(12),
    credits: z.number().min(0.5).max(6).nullable().optional(),
  })
  .strict();

export const updateCourseSchema = createCourseSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const courseListQuerySchema = z
  .object({
    departmentId: idSchema.optional(),
    semester: z.coerce.number().int().min(1).max(12).optional(),
  })
  .strict();

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type CourseListQuery = z.infer<typeof courseListQuerySchema>;
