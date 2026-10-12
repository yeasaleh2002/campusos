"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { LogIn, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { applyServerErrors, Honeypot, safeNext, useTurnstile } from "@/components/features/auth/auth-form-kit";
import { type CurrentUser, useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";

const schema = z.object({
  email: z.string().trim().min(1, "Email is required.").pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Password is required.").max(72, "Password is too long."),
  website: z.string().optional(),
});

type Values = z.infer<typeof schema>;

interface LoginFormProps {
  /** "staff" posts to /api/auth/admin/login and lands on the admin console. */
  variant?: "student" | "staff";
}

/** Email + password sign-in with inline errors, toasts, and safe `next` redirects. */
export function LoginForm({ variant = "student" }: LoginFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { setUser } = useAuth();
  const staff = variant === "staff";
  const { widget: turnstile, getToken: getTurnstileToken } = useTurnstile();
  const next = safeNext(params.get("next"), staff ? "/admin/dashboard" : "/dashboard");

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: params.get("email") ?? "", password: "", website: "" } });

  const onSubmit = async (values: Values) => {
    const toastId = toast.loading(staff ? "Verifying staff access…" : "Signing you in…");
    try {
      const turnstileToken = await getTurnstileToken();
      const data = await api.post<{ user: CurrentUser }>(staff ? "/api/auth/admin/login" : "/api/auth/login", { ...values, ...(turnstileToken ? { turnstileToken } : {}) }, { notifyUnauthorized: false });
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.name.split(" ")[0]}!`, { id: toastId });
      router.replace(next);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "EMAIL_NOT_VERIFIED") {
        toast.success("Please verify your email - we just sent a new code.", { id: toastId });
        router.push(`/verify-email?email=${encodeURIComponent(getValues("email"))}&next=${encodeURIComponent(next)}`);
        return;
      }
      applyServerErrors(error, setError, ["email", "password"]);
      if (error instanceof ApiClientError && error.code === "INVALID_CREDENTIALS") {
        setError("password", { type: "server", message: "Email or password is incorrect." }, { shouldFocus: true });
      }
      toast.error(errorMessage(error), { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-5">
      <Honeypot {...register("website")} />
      <Field label={staff ? "Staff email" : "Email"} error={errors.email?.message} required>
        <Input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" leading={<Mail />} {...register("email")} />
      </Field>
      <div className="space-y-2">
        <Field label="Password" error={errors.password?.message} required>
          <PasswordInput autoComplete="current-password" placeholder="Your password" {...register("password")} />
        </Field>
        {!staff && (
          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
        )}
      </div>
      {turnstile}
      <Button type="submit" size="lg" className="w-full" loading={isSubmitting} variant={staff ? "primary" : "gradient"}>
        {!isSubmitting && <LogIn />} {staff ? "Sign in to console" : "Sign in"}
      </Button>
    </form>
  );
}
