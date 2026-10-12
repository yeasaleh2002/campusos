"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, GraduationCap, Mail, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { applyServerErrors, Honeypot, safeNext, useFormToken, useTurnstile } from "@/components/features/auth/auth-form-kit";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";

const optionalText = (pattern: RegExp, message: string) => z.string().trim().refine((value) => value === "" || pattern.test(value), message);

const schema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120, "Name is too long."),
  email: z.string().trim().min(1, "Email is required.").pipe(z.email("Enter a valid email address.")),
  studentId: optionalText(/^[A-Za-z0-9-]{3,32}$/, "Use letters, numbers and dashes (3-32 characters)."),
  department: z.string(),
  batch: optionalText(/^.{1,16}$/, "Batch is too long."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters.")
    .regex(/[a-z]/, "Add a lowercase letter.")
    .regex(/[A-Z]/, "Add an uppercase letter.")
    .regex(/[0-9]/, "Add a number."),
  website: z.string().optional(),
});

type Values = z.infer<typeof schema>;

interface Department {
  id: string;
  code: string;
  name: string;
}

interface SignupResponse {
  email: string;
}

/** Student sign-up. Empty optional fields are dropped (the API schema is strict). */
export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const getFormToken = useFormToken();
  const { widget: turnstile, getToken: getTurnstileToken } = useTurnstile();
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => api.get<Department[]>("/api/departments"), staleTime: 3_600_000 });

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { name: "", email: "", studentId: "", department: "", batch: "", password: "", website: "" } });

  const password = useWatch({ control, name: "password" });

  const onSubmit = async ({ studentId, department, batch, ...values }: Values) => {
    const toastId = toast.loading("Creating your account…");
    const [formToken, turnstileToken] = await Promise.all([getFormToken(), getTurnstileToken()]);
    const body = { ...values, formToken, ...(turnstileToken ? { turnstileToken } : {}), ...(studentId ? { studentId } : {}), ...(department ? { department } : {}), ...(batch ? { batch } : {}) };
    const verifyUrl = (email: string) => `/verify-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent(next)}`;
    try {
      const data = await api.post<SignupResponse>("/api/auth/signup", body, { notifyUnauthorized: false });
      toast.success("Account created! Check your inbox for a 6-digit code.", { id: toastId });
      router.push(verifyUrl(data.email));
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "CONFLICT") {
        const studentConflict = /student/i.test(error.message);
        setError(studentConflict ? "studentId" : "email", { type: "server", message: studentConflict ? error.message : "This email already has an account. Sign in instead." }, { shouldFocus: true });
      } else {
        applyServerErrors(error, setError, ["name", "email", "password", "studentId", "department", "batch"]);
      }
      toast.error(errorMessage(error), { id: toastId });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="relative space-y-5">
      <Honeypot {...register("website")} />
      <Field label="Full name" error={errors.name?.message} required>
        <Input autoComplete="name" placeholder="e.g. Rahim Uddin" leading={<UserRound />} {...register("name")} />
      </Field>
      <Field label="Email" error={errors.email?.message} hint="We'll send a 6-digit code to verify it." required>
        <Input type="email" autoComplete="email" inputMode="email" placeholder="you@example.com" leading={<Mail />} {...register("email")} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Student ID" error={errors.studentId?.message} hint="Optional">
          <Input placeholder="CU-221-15-001" leading={<BadgeCheck />} {...register("studentId")} />
        </Field>
        <Field label="Batch" error={errors.batch?.message} hint="Optional">
          <Input placeholder="e.g. 59" leading={<GraduationCap />} {...register("batch")} />
        </Field>
      </div>
      <Field label="Department" error={errors.department?.message} hint="Optional - personalises notices and resources.">
        <Select {...register("department")} disabled={departments.isPending}>
          <option value="">{departments.isPending ? "Loading departments…" : "Select your department"}</option>
          {departments.data?.map((dept) => (
            <option key={dept.id} value={dept.code}>
              {dept.code} - {dept.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Password" error={errors.password?.message} required>
        <PasswordInput autoComplete="new-password" placeholder="Create a strong password" showStrength value={password} {...register("password")} />
      </Field>
      {turnstile}
      <Button type="submit" size="lg" variant="gradient" className="w-full" loading={isSubmitting}>
        Create account
      </Button>
      <p className="text-center text-xs text-fg-subtle">
        By continuing you agree to use CampusOS responsibly. See the{" "}
        <Link href="/helpdesk" className="underline hover:text-fg">
          campus helpdesk
        </Link>{" "}
        for rules.
      </p>
    </form>
  );
}
