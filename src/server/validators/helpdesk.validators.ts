import { z } from "zod";
import { KnowledgeCategory } from "@/generated/prisma/enums";
import { MAX_MESSAGE_LENGTH } from "@/server/chatbot/normalize";
import { idSchema, paginationShape } from "@/lib/validation";

const keywordsSchema = z
  .array(z.string().trim().toLowerCase().min(1).max(40))
  .max(20)
  .transform((keywords) => [...new Set(keywords)]);

export const helpdeskListQuerySchema = z
  .object({
    category: z.enum(KnowledgeCategory).optional(),
    q: z.string().trim().min(1).max(200).optional(),
    ...paginationShape,
  })
  .strict();

const entryFields = {
  category: z.enum(KnowledgeCategory),
  question: z.string().trim().min(5).max(300),
  answer: z.string().trim().min(5).max(4000),
  keywords: keywordsSchema,
  isPublished: z.boolean(),
};

export const createEntrySchema = z
  .object({ ...entryFields, keywords: keywordsSchema.default([]), isPublished: z.boolean().default(true) })
  .strict();

export const updateEntrySchema = z
  .object(entryFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const importEntriesSchema = z
  .object({
    entries: z.array(createEntrySchema).min(1).max(500),
    /** Skip entries whose question already exists (case-insensitive) instead of failing. */
    skipDuplicates: z.boolean().default(true),
  })
  .strict();

export const adminEntryListQuerySchema = z
  .object({
    category: z.enum(KnowledgeCategory).optional(),
    published: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
    q: z.string().trim().min(1).max(200).optional(),
    ...paginationShape,
  })
  .strict();

// ───────────── Chatbot ─────────────

const sessionTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32}$/, "Invalid session id.");

export const chatMessageSchema = z
  .object({
    sessionId: sessionTokenSchema.optional(),
    message: z.string().trim().min(1, "Message is required.").max(MAX_MESSAGE_LENGTH, `Keep messages under ${MAX_MESSAGE_LENGTH} characters.`),
  })
  .strict();

export const sessionParamsSchema = z.object({ id: sessionTokenSchema });

export const feedbackSchema = z.object({ sessionId: sessionTokenSchema, helpful: z.boolean() }).strict();

export const messageParamsSchema = z.object({ id: idSchema });

export const unansweredQuerySchema = z
  .object({ type: z.enum(["unanswered", "unhelpful"]).default("unanswered"), ...paginationShape })
  .strict();

export type CreateEntryInput = z.infer<typeof createEntrySchema>;
export type UpdateEntryInput = z.infer<typeof updateEntrySchema>;
export type AdminEntryListQuery = z.infer<typeof adminEntryListQuerySchema>;
