"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, ShieldQuestion } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { applyServerErrors } from "@/components/features/auth/auth-form-kit";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { Field } from "@/components/ui/field";
import { ImageDropzone, type UploadedImage } from "@/components/ui/file-dropzone";
import { Input, Select, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { COMPLAINT_CATEGORY, optionsOf } from "@/lib/labels";
import { toast, toastPromise } from "@/lib/toast";

const schema = z.object({
  category: z.string().min(1, "Choose a category."),
  subject: z.string().trim().min(5, "Give a short subject (5+ characters).").max(200, "Subject is too long."),
  description: z.string().trim().min(20, "Please describe what happened (20+ characters).").max(4000, "Keep it under 4000 characters."),
  isAnonymous: z.boolean(),
});

type Values = z.infer<typeof schema>;

interface Filed {
  ticketNo: string;
  subject: string;
}

/** File a complaint; shows a ticket-number success screen with a copy button. */
export function ComplaintForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useAuth();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [filed, setFiled] = useState<Filed | null>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { category: "", subject: "", description: "", isAnonymous: false } });

  const onSubmit = async (values: Values) => {
    try {
      const result = await toastPromise(api.post<{ complaint: Filed }>("/api/complaints", { ...values, attachmentUrls: images.map((image) => image.url) }), {
        loading: "Submitting your complaint…",
        success: (data) => `Received. Your ticket is ${(data as { complaint: Filed }).complaint.ticketNo}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["me", "complaints"] });
      setFiled(result.complaint);
    } catch (error) {
      applyServerErrors(error, setError, ["category", "subject", "description"]);
    }
  };

  if (status === "guest") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <ShieldQuestion className="mx-auto size-10 text-primary" />
        <p className="mt-3 font-display text-lg font-semibold">Sign in to file a complaint</p>
        <p className="mx-auto mt-1 max-w-md text-fg-muted">Signing in lets you track progress. You can still choose to stay anonymous to staff.</p>
        <Button className="mt-5" variant="gradient" onClick={() => router.push("/login?next=/complaints/new")}>
          Sign in
        </Button>
      </div>
    );
  }

  if (filed) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-md">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="font-display text-h3 font-bold">Complaint received</h2>
        <p className="mt-2 text-fg-muted">Keep this ticket number. We will notify you of every update.</p>
        <p className="mx-auto mt-5 w-fit rounded-xl bg-surface-2 px-5 py-3 font-mono text-2xl font-bold tracking-wider">{filed.ticketNo}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              void navigator.clipboard
                .writeText(filed.ticketNo)
                .then(() => toast.success("Ticket number copied."))
                .catch(() => toast.error("Couldn't copy - select the number manually."));
            }}
          >
            <Copy /> Copy ticket
          </Button>
          <Button asChild variant="gradient">
            <Link href={`/dashboard/complaints/${filed.ticketNo}`}>Track progress</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-5">
        <Field label="Category" error={errors.category?.message} required>
          <Select {...register("category")}>
            <option value="">Select a category</option>
            {optionsOf(COMPLAINT_CATEGORY).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Subject" error={errors.subject?.message} required>
          <Input placeholder="e.g. Bus R1 left 15 minutes early" {...register("subject")} />
        </Field>
        <Field label="What happened?" error={errors.description?.message} hint="Include date, place and anyone involved. Be factual." required>
          <Textarea rows={7} {...register("description")} />
        </Field>
      </div>
      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div>
          <p className="mb-1.5 text-sm font-semibold">Evidence (optional)</p>
          <ImageDropzone purpose="complaint" value={images} onChange={setImages} max={4} label="Add photos or screenshots" />
        </div>
        <Controller
          control={control}
          name="isAnonymous"
          render={({ field }) => (
            <div className="rounded-xl bg-surface-2 p-4">
              <Switch checked={field.value} onCheckedChange={field.onChange} label="Hide my identity from staff" description="Staff will not see your name. You can still track the ticket from your account." />
            </div>
          )}
        />
        <Button type="submit" size="lg" variant="gradient" className="w-full" loading={isSubmitting}>
          Submit complaint
        </Button>
      </div>
    </form>
  );
}
