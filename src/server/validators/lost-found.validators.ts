import { z } from "zod";
import {
  ComplaintCategory,
  ComplaintPriority,
  ComplaintStatus,
  LostFoundCategory,
  LostFoundStatus,
  LostFoundType,
} from "@/generated/prisma/enums";
import { uploadUrlSchema } from "@/lib/upload-url";
import { idSchema, paginationShape } from "@/lib/validation";
import { TICKET_PATTERN } from "@/server/domain/ticket";

const isoDateTime = z.iso.datetime({ offset: true }).transform((value) => new Date(value));
const pastDateTime = isoDateTime.refine((date) => date.getTime() <= Date.now() + 5 * 60_000, "Date can't be in the future.");

// ───────────── Lost & Found ─────────────

export const lostFoundListQuerySchema = z
  .object({
    type: z.enum(LostFoundType).optional(),
    category: z.enum(LostFoundCategory).optional(),
    /** Public statuses only; REJECTED (moderated) items are never listed. */
    status: z.enum(["OPEN", "CLAIMED", "RESOLVED"]).default("OPEN"),
    q: z.string().trim().min(1).max(100).optional(),
    dateFrom: isoDateTime.optional(),
    dateTo: isoDateTime.optional(),
    ...paginationShape,
  })
  .strict();

const itemFields = {
  type: z.enum(LostFoundType),
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(10).max(2000),
  category: z.enum(LostFoundCategory),
  locationText: z.string().trim().min(2).max(200),
  occurredAt: pastDateTime,
  imageUrls: z.array(uploadUrlSchema).max(4, "At most 4 photos."),
  contactVisible: z.boolean(),
};

export const createItemSchema = z
  .object({ ...itemFields, imageUrls: itemFields.imageUrls.default([]), contactVisible: itemFields.contactVisible.default(false) })
  .strict();

export const updateItemSchema = z
  .object({
    title: itemFields.title,
    description: itemFields.description,
    category: itemFields.category,
    locationText: itemFields.locationText,
    occurredAt: itemFields.occurredAt,
    imageUrls: itemFields.imageUrls,
    contactVisible: itemFields.contactVisible,
  })
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const claimSchema = z.object({ message: z.string().trim().min(10).max(1000) }).strict();

export const claimDecisionSchema = z.object({ decision: z.enum(["APPROVE", "REJECT"]) }).strict();

export const itemStatusSchema = z.object({ status: z.enum(LostFoundStatus) }).strict();

export const claimParamsSchema = z.object({ id: idSchema, claimId: idSchema });

export const myLostFoundQuerySchema = z
  .object({ status: z.enum(LostFoundStatus).optional(), ...paginationShape })
  .strict();

export const adminLostFoundQuerySchema = z
  .object({
    status: z.enum(LostFoundStatus).optional(),
    type: z.enum(LostFoundType).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    ...paginationShape,
  })
  .strict();

export const moderateItemSchema = z
  .object({
    action: z.enum(["HIDE", "RESTORE", "RESOLVE", "REMOVE"]),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .refine((value) => !["HIDE", "REMOVE"].includes(value.action) || value.reason, {
    message: "A reason is required when hiding or removing a post.",
    path: ["reason"],
  });

// ───────────── Complaints ─────────────

export const ticketNoSchema = z.string().trim().toUpperCase().regex(TICKET_PATTERN, "Invalid ticket number.");

export const createComplaintSchema = z
  .object({
    category: z.enum(ComplaintCategory),
    subject: z.string().trim().min(5).max(200),
    description: z.string().trim().min(20).max(5000),
    attachmentUrls: z.array(uploadUrlSchema).max(4).default([]),
    isAnonymous: z.boolean().default(false),
  })
  .strict();

export const myComplaintsQuerySchema = z
  .object({ status: z.enum(ComplaintStatus).optional(), ...paginationShape })
  .strict();

export const trackQuerySchema = z.object({ email: z.string().trim().toLowerCase().pipe(z.email()).optional() }).strict();

export const adminComplaintsQuerySchema = z
  .object({
    status: z.enum(ComplaintStatus).optional(),
    priority: z.enum(ComplaintPriority).optional(),
    category: z.enum(ComplaintCategory).optional(),
    /** "me", "unassigned", or a staff user id. */
    assignee: z.union([z.enum(["me", "unassigned"]), idSchema]).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    ...paginationShape,
  })
  .strict();

export const updateComplaintSchema = z
  .object({
    status: z.enum(ComplaintStatus).optional(),
    priority: z.enum(ComplaintPriority).optional(),
    assignedToId: idSchema.nullable().optional(),
    note: z.string().trim().min(3).max(2000).optional(),
    /** Internal notes are staff-only; public notes are emailed to the complainant. */
    isInternal: z.boolean().default(false),
  })
  .strict()
  .refine((value) => value.status || value.priority || value.assignedToId !== undefined || value.note, {
    message: "Provide a status, priority, assignee or note.",
  });

export type LostFoundListQuery = z.infer<typeof lostFoundListQuerySchema>;
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ModerateItemInput = z.infer<typeof moderateItemSchema>;
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type AdminComplaintsQuery = z.infer<typeof adminComplaintsQuerySchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
