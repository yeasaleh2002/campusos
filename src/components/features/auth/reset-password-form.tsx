"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { applyServerErrors } from "@/components/features/auth/auth-form-kit";
import { ResendCode, useResendCode } from "@/components/features/auth/resend-code";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { PasswordInput } from "@/components/ui/password-input";
import { api, errorMessage } from "@/lib/api-client";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required.").pipe(z.email("Enter a valid email address.")),
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your email."),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters.")
    .regex(/[a-z]/, "Add a lowercase letter.")
    .regex(/[A-Z]/, "Add an uppercase letter.")
    .regex(/[0-9]/, "Add a number."),
});

type Values = z.infer<typeof schema>;

/** Code + new password. All sessions are revoked server-side, so we send the user to sign in. */
export function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: params.get("email") ?? "", code: "", newPassword: "" } });
  const email = useWatch({ control, name: "email" });
  const newPassword = useWatch({ control, name: "newPassword" });
  const resend = useResendCode(email, "PASSWORD_RESET");

  const onSubmit = async (values: Values) => {
    const toastId = toast.loading("Updating your password…");
    try {
      await api.post("/api/auth/reset-password", values, { notifyUnauthorized: false });
      toast.success("Password updated. Please sign in.", { id: toastId });
      router.replace(`/login?email=${encodeURIComponent(values.email.trim().toLowerCase())}`);
    } catch (error) {
      applyServerErrors(error, setError, ["email", "code", "newPassword"]);
      toast.error(errorMessage(error), { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Field label="Email" error={errors.email?.message} required>
        <Input type="email" autoComplete="email" inputMode="email" leading={<Mail />} {...register("email")} />
      </Field>
      <div className="space-y-2">
        <p className="text-sm font-semibold">
          Reset code<span className="ml-0.5 text-danger" aria-hidden>*</span>
        </p>
        <Controller control={control} name="code" render={({ field }) => <OtpInput value={field.value} onChange={field.onChange} invalid={Boolean(errors.code)} autoFocus />} />
        {errors.code && (
          <p role="alert" className="text-center text-sm text-danger">
            {errors.code.message}
          </p>
        )}
      </div>
      <Field label="New password" error={errors.newPassword?.message} required>
        <PasswordInput autoComplete="new-password" showStrength value={newPassword} {...register("newPassword")} />
      </Field>
      <Button type="submit" size="lg" variant="gradient" className="w-full" loading={isSubmitting}>
        Update password
      </Button>
      <ResendCode seconds={resend.seconds} sending={resend.sending} onResend={() => void resend.resend()} />
      <p className="text-center text-sm text-fg-muted">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
