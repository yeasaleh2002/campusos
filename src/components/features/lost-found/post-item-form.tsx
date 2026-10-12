"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { PackageCheck, PackageSearch } from "lucide-react";
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
import { invalidateLostFound } from "@/lib/query-client";
import { LOST_FOUND_CATEGORY, optionsOf } from "@/lib/labels";
import { toastPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";

const schema = z.object({
  type: z.enum(["LOST", "FOUND"]),
  title: z.string().trim().min(3, "Give the item a short title.").max(160, "Title is too long."),
  description: z.string().trim().min(10, "Add a few details (10+ characters) - colour, brand, marks.").max(2000, "Keep it under 2000 characters."),
  category: z.string().min(1, "Choose a category."),
  locationText: z.string().trim().min(2, "Where was it?").max(200),
  occurredAt: z.string().min(1, "When was it?").refine((value) => new Date(value).getTime() <= Date.now() + 5 * 60_000, "That time is in the future."),
  contactVisible: z.boolean(),
});

type Values = z.infer<typeof schema>;

/** datetime-local gives a zone-less local time; convert to an absolute ISO instant (the API requires an offset). */
const toDhakaIso = (local: string) => new Date(`${local}:00`).toISOString();

const nowLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

/** Post a lost or found item with up to 4 photos. */
export function PostItemForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { status } = useAuth();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { type: "LOST", title: "", description: "", category: "", locationText: "", occurredAt: "", contactVisible: false },
  });

  const onSubmit = async (values: Values) => {
    try {
      const created = await toastPromise(
        api.post<{ id: string }>("/api/lost-found", { ...values, occurredAt: toDhakaIso(values.occurredAt), imageUrls: images.map((image) => image.url) }),
        { loading: "Posting…", success: "Posted! We will watch for matches." },
      );
      await invalidateLostFound(queryClient);
      router.push(`/lost-found/${created.id}`);
      router.refresh();
    } catch (error) {
      applyServerErrors(error, setError, ["title", "description", "category", "locationText", "occurredAt"]);
    }
  };

  if (status === "guest") {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="font-display text-lg font-semibold">Sign in to post an item</p>
        <p className="mt-1 text-fg-muted">We ask you to sign in so only genuine owners can claim items.</p>
        <Button className="mt-5" variant="gradient" onClick={() => router.push("/login?next=/lost-found/new")}>
          Sign in
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
      <div className="space-y-5">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <div role="radiogroup" aria-label="Post type" className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: "LOST", label: "I lost something", icon: PackageSearch },
                  { value: "FOUND", label: "I found something", icon: PackageCheck },
                ] as const
              ).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === value}
                  onClick={() => field.onChange(value)}
                  className={cn("flex items-center justify-center gap-2 rounded-2xl border-2 px-4 py-4 text-sm font-semibold transition", field.value === value ? "border-primary bg-primary-soft text-primary-soft-fg" : "border-border text-fg-muted hover:border-border-strong")}
                >
                  <Icon className="size-5" /> {label}
                </button>
              ))}
            </div>
          )}
        />
        <Field label="Title" error={errors.title?.message} required>
          <Input placeholder="e.g. Black wallet with CU ID card" {...register("title")} />
        </Field>
        <Field label="Description" error={errors.description?.message} hint="Do not include phone numbers - use the contact switch instead." required>
          <Textarea rows={4} {...register("description")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Category" error={errors.category?.message} required>
            <Select {...register("category")}>
              <option value="">Select category</option>
              {optionsOf(LOST_FOUND_CATEGORY).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Where?" error={errors.locationText?.message} required>
            <Input placeholder="e.g. Library 2nd floor" {...register("locationText")} />
          </Field>
        </div>
        <Field label="When?" error={errors.occurredAt?.message} required>
          <Input type="datetime-local" max={nowLocal()} {...register("occurredAt")} />
        </Field>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div>
          <p className="mb-1.5 text-sm font-semibold">Photos (up to 4)</p>
          <ImageDropzone purpose="lost-found" value={images} onChange={setImages} max={4} label="Add photos" />
        </div>
        <Controller
          control={control}
          name="contactVisible"
          render={({ field }) => (
            <div className="rounded-xl bg-surface-2 p-4">
              <Switch checked={field.value} onCheckedChange={field.onChange} label="Share my contact with an approved claimer" description="Off by default. Your email and phone are never public." />
            </div>
          )}
        />
        <Button type="submit" size="lg" variant="gradient" className="w-full" loading={isSubmitting}>
          Post item
        </Button>
      </div>
    </form>
  );
}
