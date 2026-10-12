import { z } from "zod";
import { ModerationStatus, ResourceType } from "@/generated/prisma/enums";
import { uploadUrlSchema } from "@/lib/upload-url";
import { idSchema, paginationShape } from "@/lib/validation";
import { RESOURCE_SORTS } from "@/server/search/resource-search";

const CURRENT_YEAR = new Date().getUTCFullYear();

const semesterSchema = z.coerce.number().int().min(1).max(12);
const yearSchema = z.coerce.number().int().min(2000).max(CURRENT_YEAR + 1);

/** Tags are lower-cased, de-duplicated and capped at 10. */
const tagsSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(30).regex(/^[\p{L}\p{N} +#.-]+$/u, "Invalid tag."))
  .max(10)
  .transform((tags) => [...new Set(tags)]);

export const resourceListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    departmentId: idSchema.optional(),
    courseId: idSchema.optional(),
    semester: semesterSchema.optional(),
    year: yearSchema.optional(),
    type: z.enum(ResourceType).optional(),
    sort: z.enum(RESOURCE_SORTS).default("relevance"),
    ...paginationShape,
  })
  .strict();

const resourceFields = {
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).nullable(),
  type: z.enum(ResourceType),
  courseId: idSchema.nullable(),
  courseName: z.string().trim().min(2, "Enter at least 2 characters.").max(120).nullable(),
  departmentId: idSchema,
  semester: z.number().int().min(1).max(12).nullable(),
  year: z.number().int().min(2000).max(CURRENT_YEAR + 1).nullable(),
  tags: tagsSchema,
};

export const createResourceSchema = z
  .object({
    ...resourceFields,
    description: resourceFields.description.optional(),
    courseId: resourceFields.courseId.optional(),
    courseName: resourceFields.courseName.optional(),
    semester: resourceFields.semester.optional(),
    year: resourceFields.year.optional(),
    tags: resourceFields.tags.default([]),
    fileUrl: uploadUrlSchema,
    fileKey: z.string().regex(/^[A-Za-z0-9_.-]{8,128}$/, "Invalid file key."),
    fileSize: z.number().int().positive().max(16 * 1024 * 1024),
    mimeType: z.literal("application/pdf"),
  })
  .strict()
  .refine((value) => !(value.courseId && value.courseName), { message: "Choose a listed course or type your own, not both.", path: ["courseName"] });

export const updateResourceSchema = z
  .object(resourceFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const reviewResourceSchema = z
  .object({
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine((value) => value.decision === "APPROVE" || value.reason, {
    message: "A reason is required when rejecting.",
    path: ["reason"],
  });

export const bulkReviewSchema = z
  .object({
    ids: z.array(idSchema).min(1).max(50),
    decision: z.enum(["APPROVE", "REJECT"]),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine((value) => value.decision === "APPROVE" || value.reason, {
    message: "A reason is required when rejecting.",
    path: ["reason"],
  });

export const adminResourceListQuerySchema = z
  .object({
    status: z.enum(ModerationStatus).default("PENDING"),
    departmentId: idSchema.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    ...paginationShape,
  })
  .strict();

export const myResourcesQuerySchema = z
  .object({ status: z.enum(ModerationStatus).optional(), ...paginationShape })
  .strict();

export type ResourceListQuery = z.infer<typeof resourceListQuerySchema>;
export type CreateResourceInput = z.infer<typeof createResourceSchema>;
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;
export type ReviewResourceInput = z.infer<typeof reviewResourceSchema>;
export type AdminResourceListQuery = z.infer<typeof adminResourceListQuerySchema>;
