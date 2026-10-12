import { z } from "zod";
import { OtpPurpose } from "@/generated/prisma/enums";
import { passwordSchema } from "@/lib/auth/password";
import { uploadUrlSchema } from "@/lib/upload-url";
import { botFieldsShape } from "@/server/middleware/bot-protection";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.").max(254));

export const nameSchema = z
  .string()
  .trim()
  .min(2, "Name must be at least 2 characters.")
  .max(120)
  .regex(/^[^<>{}\\]+$/, "Name contains invalid characters.");

export const otpCodeSchema = z.string().regex(/^\d{6}$/, "Code must be 6 digits.");

const studentIdSchema = z.string().trim().regex(/^[A-Za-z0-9-]{3,32}$/, "Invalid student ID.");
const departmentCodeSchema = z.string().trim().regex(/^[A-Za-z]{2,16}$/, "Invalid department code.");
const batchSchema = z.string().trim().min(1).max(16);
const phoneSchema = z.string().trim().regex(/^\+?[0-9][0-9\s-]{6,18}$/, "Invalid phone number.");

/** Login passwords are not policy-checked (legacy/seeded users), only bounded. */
const loginPasswordSchema = z.string().min(1, "Password is required.").max(72);

export const signupSchema = z
  .object({
    ...botFieldsShape,
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    studentId: studentIdSchema.optional(),
    department: departmentCodeSchema.optional(),
    batch: batchSchema.optional(),
  })
  .strict();

export const verifyEmailSchema = z.object({ email: emailSchema, code: otpCodeSchema }).strict();

export const resendOtpSchema = z.object({ email: emailSchema, purpose: z.enum(OtpPurpose) }).strict();

export const loginSchema = z
  .object({ ...botFieldsShape, email: emailSchema, password: loginPasswordSchema })
  .strict();

export const forgotPasswordSchema = z.object({ ...botFieldsShape, email: emailSchema }).strict();

export const resetPasswordSchema = z
  .object({ email: emailSchema, code: otpCodeSchema, newPassword: passwordSchema })
  .strict();

export const updateProfileSchema = z
  .object({
    name: nameSchema.optional(),
    studentId: studentIdSchema.nullable().optional(),
    department: departmentCodeSchema.nullable().optional(),
    batch: batchSchema.nullable().optional(),
    phone: phoneSchema.nullable().optional(),
    avatarUrl: uploadUrlSchema.nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one field to update." });

export const changePasswordSchema = z
  .object({ currentPassword: loginPasswordSchema, newPassword: passwordSchema })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "New password must be different from the current password.",
    path: ["newPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
