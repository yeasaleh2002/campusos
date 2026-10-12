"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { applyServerErrors, Honeypot, useFormToken, useTurnstile } from "@/components/features/auth/auth-form-kit";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, errorMessage } from "@/lib/api-client";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required.").pipe(z.email("Enter a valid email address.")),
  website: z.string().optional(),
});

type Values = z.infer<typeof schema>;

/** Requests a reset code. The API answers identically whether or not the email exists. */
export function ForgotPasswordForm() {
  const router = useRouter();
  const getFormToken = useFormToken();
  const { widget: turnstile, getToken: getTurnstileToken } = useTurnstile();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: "", website: "" } });

  const onSubmit = async (values: Values) => {
    const toastId = toast.loading("Sending reset code…");
    try {
      const [formToken, turnstileToken] = await Promise.all([getFormToken(), getTurnstileToken()]);
      await api.post("/api/auth/forgot-password", { ...values, formToken, ...(turnstileToken ? { turnstileToken } : {}) }, { notifyUnauthorized: false });
      toast.success("If that email has an account, a reset code is on its way.", { id: toastId });
      router.push(`/reset-password?email=${encodeURIComponent(values.email.trim().toLowerCase())}`);
    } catch (error) {
      applyServerErrors(error, setError, ["email"]);
      toast.error(errorMessage(error), { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-5">
      <Honeypot {...register("website")} />
      <Field label="Email" error={errors.email?.message} required>
        <Input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" leading={<Mail />} {...register("email")} />
      </Field>
      {turnstile}
      <Button type="submit" size="lg" variant="gradient" className="w-full" loading={isSubmitting}>
        Send reset code
      </Button>
    </form>
  );
}
