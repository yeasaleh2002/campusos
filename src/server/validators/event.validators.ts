import { z } from "zod";
import { EventStatus, EventType, RegistrationStatus } from "@/generated/prisma/enums";
import { uploadUrlSchema } from "@/lib/upload-url";
import { idSchema, paginationShape, slugSchema } from "@/lib/validation";

/** ISO-8601 with an explicit offset, e.g. "2026-11-02T15:00:00+06:00". */
const isoDateTime = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

export const EVENT_WINDOWS = ["upcoming", "thisWeek", "past", "all"] as const;

export const eventListQuerySchema = z
  .object({
    clubId: idSchema.optional(),
    clubSlug: slugSchema.optional(),
    type: z.enum(EventType).optional(),
    when: z.enum(EVENT_WINDOWS).default("upcoming"),
    dateFrom: isoDateTime.optional(),
    dateTo: isoDateTime.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    ...paginationShape,
  })
  .strict()
  .refine((value) => !value.dateFrom || !value.dateTo || value.dateFrom < value.dateTo, {
    message: "dateFrom must be before dateTo.",
    path: ["dateTo"],
  });

export const calendarQuerySchema = z
  .object({ month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Use YYYY-MM.") })
  .strict();

export const eventIdParamsSchema = z.object({ eventRef: idSchema });

const eventFields = {
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(10_000),
  clubId: idSchema,
  type: z.enum(EventType),
  startAt: isoDateTime,
  endAt: isoDateTime,
  venue: z.string().trim().min(2).max(200),
  bannerUrl: uploadUrlSchema.nullable(),
  capacity: z.number().int().min(1).max(100_000).nullable(),
  registrationDeadline: isoDateTime.nullable(),
};

export const createEventSchema = z
  .object({
    ...eventFields,
    bannerUrl: eventFields.bannerUrl.optional(),
    capacity: eventFields.capacity.optional(),
    registrationDeadline: eventFields.registrationDeadline.optional(),
    /** Publish immediately instead of saving as a draft. */
    publish: z.boolean().default(false),
    /** Required when the start date is a weekly off day or a campus closure (the form asks the organiser to confirm). */
    confirmOffDay: z.boolean().optional(),
  })
  .strict();

export const updateEventSchema = z
  .object({ ...eventFields, confirmOffDay: z.boolean() })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const cancelEventSchema = z.object({ reason: z.string().trim().min(3).max(500) }).strict();

export const adminEventListQuerySchema = z
  .object({
    status: z.enum(EventStatus).optional(),
    clubId: idSchema.optional(),
    q: z.string().trim().min(1).max(100).optional(),
    ...paginationShape,
  })
  .strict();

export const registrationListQuerySchema = z
  .object({
    status: z.enum(RegistrationStatus).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    ...paginationShape,
  })
  .strict();

export const myRegistrationsQuerySchema = z
  .object({ status: z.enum(RegistrationStatus).optional(), ...paginationShape })
  .strict();

export const qrQuerySchema = z.object({ format: z.enum(["json", "png"]).default("json") }).strict();

export const checkInSchema = z
  .object({
    qrToken: z.string().trim().regex(/^[A-Za-z0-9_-]{32}$/, "Invalid ticket code."),
    eventId: idSchema,
  })
  .strict();

export const manualCheckInParamsSchema = z.object({ id: idSchema, registrationId: idSchema });

export type EventListQuery = z.infer<typeof eventListQuerySchema>;
export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type AdminEventListQuery = z.infer<typeof adminEventListQuerySchema>;
export type RegistrationListQuery = z.infer<typeof registrationListQuerySchema>;
