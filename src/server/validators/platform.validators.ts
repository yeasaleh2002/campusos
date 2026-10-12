import { z } from "zod";
import { Role } from "@/generated/prisma/enums";
import { idSchema, paginationShape } from "@/lib/validation";

export const globalSearchQuerySchema = z
  .object({
    q: z.string().trim().min(2, "Type at least 2 characters.").max(100),
    /** Results per group (max 10). */
    limit: z.coerce.number().int().min(1).max(10).default(5),
  })
  .strict();

export const notificationListQuerySchema = z
  .object({
    unreadOnly: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    ...paginationShape,
  })
  .strict();

export const adminUserListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    role: z.enum(Role).optional(),
    isActive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    ...paginationShape,
  })
  .strict();

export const updateUserSchema = z
  .object({ role: z.enum(Role).optional(), isActive: z.boolean().optional() })
  .strict()
  .refine((value) => value.role !== undefined || value.isActive !== undefined, { message: "Provide role and/or isActive." });

export const auditLogQuerySchema = z
  .object({
    action: z.string().trim().max(64).regex(/^[a-z_.]+$/, "Invalid action.").optional(),
    entityType: z.string().trim().max(64).regex(/^[A-Za-z]+$/, "Invalid entity type.").optional(),
    entityId: z.string().trim().max(64).optional(),
    actorId: idSchema.optional(),
    ...paginationShape,
  })
  .strict();

export const revalidateSchema = z
  .object({ tags: z.array(z.string().trim().min(1).max(100)).min(1).max(50) })
  .strict();

export type AdminUserListQuery = z.infer<typeof adminUserListQuerySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
