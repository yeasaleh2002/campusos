import { z } from "zod";
import { BusDirection, FollowTargetType, NoticeCategory } from "@/generated/prisma/enums";
import { busStopsSchema, departureTimeSchema } from "@/server/domain/bus-schedule-schemas";
import { uploadUrlSchema } from "@/lib/upload-url";
import { idSchema, paginationShape } from "@/lib/validation";

/** ISO-8601 with an explicit offset → Date. */
const isoDateTime = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

// ───────────── Bus ─────────────

export const busRouteCodeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,16}$/, "Invalid route code.");

export const nextBusQuerySchema = z
  .object({
    route: busRouteCodeSchema,
    stop: z.string().trim().min(2).max(80).optional(),
    direction: z.enum(BusDirection).optional(),
    limit: z.coerce.number().int().min(1).max(10).default(3),
  })
  .strict();

const daysOfWeekSchema = z
  .array(z.number().int().min(0).max(6))
  .min(1)
  .max(7)
  .transform((days) => [...new Set(days)].sort());

export const createRouteSchema = z
  .object({
    code: busRouteCodeSchema,
    name: z.string().trim().min(2).max(120),
    stops: busStopsSchema,
    notes: z.string().trim().max(1000).nullable().optional(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateRouteSchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    stops: busStopsSchema,
    notes: z.string().trim().max(1000).nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const createTripSchema = z
  .object({
    departureTime: departureTimeSchema,
    direction: z.enum(BusDirection),
    daysOfWeek: daysOfWeekSchema,
    isActive: z.boolean().default(true),
  })
  .strict();

export const updateTripSchema = z
  .object({ departureTime: departureTimeSchema, direction: z.enum(BusDirection), daysOfWeek: daysOfWeekSchema, isActive: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

// ───────────── Notices ─────────────

export const noticeListQuerySchema = z
  .object({
    category: z.enum(NoticeCategory).optional(),
    departmentId: idSchema.optional(),
    courseId: idSchema.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    ...paginationShape,
  })
  .strict();

const noticeFields = {
  title: z.string().trim().min(3).max(200),
  body: z.string().trim().min(3).max(10_000),
  category: z.enum(NoticeCategory),
  departmentId: idSchema.nullable(),
  courseId: idSchema.nullable(),
  pinned: z.boolean(),
  expiresAt: isoDateTime.nullable(),
  /** PDF or image uploaded through the upload pipeline. */
  attachmentUrl: uploadUrlSchema.nullable(),
};

export const createNoticeSchema = z
  .object({
    ...noticeFields,
    category: noticeFields.category.default("GENERAL"),
    departmentId: noticeFields.departmentId.optional(),
    courseId: noticeFields.courseId.optional(),
    pinned: noticeFields.pinned.default(false),
    expiresAt: noticeFields.expiresAt.optional(),
    attachmentUrl: noticeFields.attachmentUrl.optional(),
  })
  .strict();

export const updateNoticeSchema = z
  .object(noticeFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

// ───────────── Forms ─────────────

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .url()
  .refine((value) => new URL(value).protocol === "https:", "Form links must use https.");

export const formListQuerySchema = z.object({ clubId: idSchema.optional(), ...paginationShape }).strict();

export const createFormSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(1000).nullable().optional(),
    url: httpsUrl,
    deadline: isoDateTime.nullable().optional(),
    clubId: idSchema.nullable().optional(),
    isOpen: z.boolean().default(true),
  })
  .strict();

export const updateFormSchema = z
  .object({
    title: z.string().trim().min(3).max(200),
    description: z.string().trim().max(1000).nullable(),
    url: httpsUrl,
    deadline: isoDateTime.nullable(),
    clubId: idSchema.nullable(),
    isOpen: z.boolean(),
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

// ───────────── Follow ─────────────

export const followSchema = z.object({ targetType: z.enum(FollowTargetType), targetId: idSchema }).strict();

export type CreateRouteInput = z.infer<typeof createRouteSchema>;
export type UpdateRouteInput = z.infer<typeof updateRouteSchema>;
export type CreateTripInput = z.infer<typeof createTripSchema>;
export type UpdateTripInput = z.infer<typeof updateTripSchema>;
export type NoticeListQuery = z.infer<typeof noticeListQuerySchema>;
export type CreateNoticeInput = z.infer<typeof createNoticeSchema>;
export type UpdateNoticeInput = z.infer<typeof updateNoticeSchema>;
export type CreateFormInput = z.infer<typeof createFormSchema>;
export type UpdateFormInput = z.infer<typeof updateFormSchema>;
export type FollowInput = z.infer<typeof followSchema>;
