import { z } from "zod";
import { ClubCategory, ClubMemberRole } from "@/generated/prisma/enums";
import { uploadUrlSchema } from "@/lib/upload-url";
import { idSchema, paginationShape, slugSchema } from "@/lib/validation";

const nameSchema = z.string().trim().min(3).max(120);
const descriptionSchema = z.string().trim().min(10).max(5000);

export const clubListQuerySchema = z
  .object({
    category: z.enum(ClubCategory).optional(),
    q: z.string().trim().min(1).max(100).optional(),
    ...paginationShape,
  })
  .strict();

export const createClubSchema = z
  .object({
    name: nameSchema,
    slug: slugSchema.max(140).optional(),
    description: descriptionSchema,
    category: z.enum(ClubCategory),
    logoUrl: uploadUrlSchema.nullable().optional(),
    coverUrl: uploadUrlSchema.nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .strict();

export const updateClubSchema = createClubSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const adminClubListQuerySchema = z
  .object({
    q: z.string().trim().min(1).max(100).optional(),
    includeInactive: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    ...paginationShape,
  })
  .strict();

export const clubMemberListQuerySchema = z.object({ ...paginationShape }).strict();

export const addClubMemberSchema = z
  .object({ email: z.string().trim().toLowerCase().pipe(z.email()), role: z.enum(ClubMemberRole).default("MEMBER") })
  .strict();

export const updateClubMemberSchema = z.object({ role: z.enum(ClubMemberRole) }).strict();

export const clubMemberParamsSchema = z.object({ id: idSchema, userId: idSchema });

export type AddClubMemberInput = z.infer<typeof addClubMemberSchema>;
export type ClubListQuery = z.infer<typeof clubListQuerySchema>;
export type CreateClubInput = z.infer<typeof createClubSchema>;
export type UpdateClubInput = z.infer<typeof updateClubSchema>;
export type AdminClubListQuery = z.infer<typeof adminClubListQuerySchema>;
