import { z } from "zod";
import { paginationShape } from "@/lib/validation";

/** `YYYY-MM-DD`, a real calendar date. */
export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a real calendar date.");

const closureFields = {
  date: dateKeySchema,
  title: z.string().trim().min(3, "Give the closure a title.").max(120),
  closesCampus: z.boolean(),
  suspendsBus: z.boolean(),
  note: z.string().trim().max(300).nullable(),
};

const needsEffect = (value: { closesCampus?: boolean; suspendsBus?: boolean }) => value.closesCampus !== false || value.suspendsBus !== false;
const EFFECT_MESSAGE = { message: "A closure must close the campus, suspend the bus, or both.", path: ["closesCampus"] };

export const createClosureSchema = z
  .object({ ...closureFields, closesCampus: closureFields.closesCampus.default(true), suspendsBus: closureFields.suspendsBus.default(true), note: closureFields.note.optional() })
  .strict()
  .refine(needsEffect, EFFECT_MESSAGE);

export const updateClosureSchema = z
  .object(closureFields)
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." })
  .refine(needsEffect, EFFECT_MESSAGE);

export const closureListQuerySchema = z
  .object({
    /** Include closures before today (admin history). */
    includePast: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
    ...paginationShape,
  })
  .strict();

export type CreateClosureInput = z.infer<typeof createClosureSchema>;
export type UpdateClosureInput = z.infer<typeof updateClosureSchema>;
export type ClosureListQuery = z.infer<typeof closureListQuerySchema>;
