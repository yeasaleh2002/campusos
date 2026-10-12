"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { BellOff, Camera, KeyRound, LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { applyServerErrors } from "@/components/features/auth/auth-form-kit";
import { useFollows, type FollowRow } from "@/components/features/follow/follow-button";
import { type CurrentUser, useAuth } from "@/components/providers/auth-provider";
import { ThemeSegmented } from "@/components/shared/theme-toggle";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { api, ApiClientError, errorMessage } from "@/lib/api-client";
import { toast, toastPromise } from "@/lib/toast";
import { queryKeys } from "@/lib/query-client";
import { useQueryClient } from "@tanstack/react-query";

interface Department {
  id: string;
  code: string;
  name: string;
}

const profileSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(120, "Name is too long."),
  studentId: z.string().trim().refine((value) => value === "" || /^[A-Za-z0-9-]{3,32}$/.test(value), "Use letters, numbers and dashes (3-32 characters)."),
  department: z.string(),
  batch: z.string().trim().max(16, "Batch is too long."),
  phone: z.string().trim().refine((value) => value === "" || /^\+?[0-9\s-]{7,20}$/.test(value), "Enter a valid phone number."),
});

type ProfileValues = z.infer<typeof profileSchema>;

function ProfileForm({ user }: { user: CurrentUser }) {
  const { setUser } = useAuth();
  const departments = useQuery({ queryKey: ["departments"], queryFn: () => api.get<Department[]>("/api/departments"), staleTime: 3_600_000 });
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, studentId: user.studentId ?? "", department: user.department?.code ?? "", batch: user.batch ?? "", phone: user.phone ?? "" },
  });

  const onSubmit = async (values: ProfileValues) => {
    // Empty optional fields clear the stored value (null); the API treats absent keys as "unchanged".
    const body = { name: values.name, studentId: values.studentId || null, department: values.department || null, batch: values.batch || null, phone: values.phone || null };
    try {
      const result = await toastPromise(api.patch<{ user: CurrentUser }>("/api/users/me", body), { loading: "Saving…", success: "Profile updated." });
      setUser(result.user);
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "CONFLICT") setError("studentId", { type: "server", message: "This student ID is already in use." });
      else applyServerErrors(error, setError, ["name", "studentId", "department", "batch", "phone"]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Field label="Full name" error={errors.name?.message} required>
        <Input autoComplete="name" {...register("name")} />
      </Field>
      <Field label="Email" hint="Your sign-in email cannot be changed.">
        <Input value={user.email} readOnly disabled />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Student ID" error={errors.studentId?.message}>
          <Input {...register("studentId")} />
        </Field>
        <Field label="Batch" error={errors.batch?.message}>
          <Input {...register("batch")} />
        </Field>
        <Field label="Department" error={errors.department?.message}>
          <Select {...register("department")}>
            <option value="">Not set</option>
            {departments.data?.map((dept) => (
              <option key={dept.id} value={dept.code}>
                {dept.code} - {dept.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Phone" error={errors.phone?.message}>
          <Input type="tel" autoComplete="tel" placeholder="+8801…" {...register("phone")} />
        </Field>
      </div>
      <Button type="submit" variant="gradient" loading={isSubmitting} disabled={!isDirty}>
        Save changes
      </Button>
    </form>
  );
}

function AvatarCard({ user }: { user: CurrentUser }) {
  const { setUser } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image.");
    if (file.size > 4 * 1024 * 1024) return void toast.error("Images must be under 4 MB.");
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("purpose", "avatar");
      const response = await fetch("/api/upload/image", { method: "POST", body: form });
      const body = (await response.json()) as { success: boolean; data?: { url: string }; error?: { message: string } };
      if (!body.success || !body.data) throw new Error(body.error?.message ?? "Upload failed.");
      const result = await toastPromise(api.patch<{ user: CurrentUser }>("/api/users/me", { avatarUrl: body.data.url }), { loading: "Saving photo…", success: "Profile photo updated." });
      setUser(result.user);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-5">
      <Avatar name={user.name} src={user.avatarUrl} size="xl" />
      <div>
        <p className="font-display text-lg font-semibold">{user.name}</p>
        <p className="text-sm text-fg-muted">{user.email}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label="Choose profile photo" onChange={(event) => void upload(event.target.files?.[0])} />
          <Button size="sm" variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
            <Camera /> Change photo
          </Button>
          <Badge tone="primary">{user.role.replace("_", " ")}</Badge>
        </div>
      </div>
    </div>
  );
}

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password."),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(72, "Password must be at most 72 characters.")
    .regex(/[a-z]/, "Add a lowercase letter.")
    .regex(/[A-Z]/, "Add an uppercase letter.")
    .regex(/[0-9]/, "Add a number."),
});

type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordForm() {
  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "" } });
  const newPassword = useWatch({ control, name: "newPassword" });

  const onSubmit = async (values: PasswordValues) => {
    try {
      await toastPromise(api.post("/api/users/me/change-password", values), { loading: "Updating password…", success: "Password changed. Other devices were signed out." });
      reset();
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "INVALID_CURRENT_PASSWORD") setError("currentPassword", { type: "server", message: "That is not your current password." }, { shouldFocus: true });
      else applyServerErrors(error, setError, ["currentPassword", "newPassword"]);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <Field label="Current password" error={errors.currentPassword?.message} required>
        <PasswordInput autoComplete="current-password" {...register("currentPassword")} />
      </Field>
      <Field label="New password" error={errors.newPassword?.message} required>
        <PasswordInput autoComplete="new-password" showStrength value={newPassword} {...register("newPassword")} />
      </Field>
      <Button type="submit" variant="secondary" loading={isSubmitting}>
        <KeyRound /> Change password
      </Button>
    </form>
  );
}

function SessionsCard() {
  const { logout } = useAuth();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const signOutEverywhere = async () => {
    setBusy(true);
    try {
      await toastPromise(api.post("/api/auth/logout-all"), { loading: "Signing out everywhere…", success: "Signed out on all devices." });
      await logout();
      router.push("/login");
    } catch {
      setConfirm(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-md text-sm text-fg-muted">Lost a phone or used a shared computer? Sign out of every device, including this one.</p>
        <Button variant="danger" onClick={() => setConfirm(true)}>
          <LogOut /> Sign out everywhere
        </Button>
      </div>
      <ConfirmDialog open={confirm} onOpenChange={setConfirm} title="Sign out on all devices?" description="You will need to sign in again everywhere, including here." confirmLabel="Sign out everywhere" destructive loading={busy} onConfirm={() => void signOutEverywhere()} />
    </>
  );
}

function FollowsCard() {
  const queryClient = useQueryClient();
  const follows = useFollows();
  const [busyId, setBusyId] = useState<string | null>(null);

  const unfollow = async (row: FollowRow) => {
    setBusyId(row.targetId);
    try {
      await toastPromise(api.delete("/api/follow", { query: { targetType: row.targetType, targetId: row.targetId } }), { loading: "Unfollowing…", success: `Unfollowed ${row.name}.` });
      await queryClient.invalidateQueries({ queryKey: queryKeys.follows });
    } catch {
      // toast shown
    } finally {
      setBusyId(null);
    }
  };

  if (follows.isPending) return <Skeleton className="h-24 rounded-xl" />;
  if (!follows.data || follows.data.length === 0) return <p className="rounded-xl bg-surface-2 p-4 text-sm text-fg-muted">You are not following any clubs, courses or departments yet. Follow one to get notified about its notices.</p>;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border">
      {follows.data.map((row) => (
        <li key={`${row.targetType}-${row.targetId}`} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{row.name}</p>
            <Badge tone="neutral">{row.targetType.toLowerCase()}</Badge>
          </div>
          <Button size="sm" variant="ghost" loading={busyId === row.targetId} onClick={() => void unfollow(row)}>
            <BellOff /> Unfollow
          </Button>
        </li>
      ))}
    </ul>
  );
}

/** Account page sections: photo, details, password, follows, theme and sessions. */
export function ProfilePanel() {
  const { user, status } = useAuth();
  if (status === "loading" || !user) return <Skeleton className="h-96 rounded-2xl" />;
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className="xl:col-span-2">
        <CardContent className="pt-6">
          <AvatarCard user={user} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="size-5 text-primary" /> Your details
          </CardTitle>
          <CardDescription>Shown on tickets and claims. Only you can edit them.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm key={user.id} user={user} />
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Password</CardTitle>
            <CardDescription>Changing it signs out your other devices.</CardDescription>
          </CardHeader>
          <CardContent>
            <PasswordForm />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Light, dark, or follow your device.</CardDescription>
          </CardHeader>
          <CardContent>
            <ThemeSegmented />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Following</CardTitle>
          <CardDescription>You get notices and events from these.</CardDescription>
        </CardHeader>
        <CardContent>
          <FollowsCard />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <SessionsCard />
        </CardContent>
      </Card>
    </div>
  );
}
