"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { applyServerErrors } from "@/components/features/auth/auth-form-kit";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Field } from "@/components/ui/field";
import { type UploadedPdf, PdfDropzone } from "@/components/ui/file-dropzone";
import { Input, Select, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api-client";
import { RESOURCE_TYPE, optionsOf } from "@/lib/labels";
import { toast, toastPromise } from "@/lib/toast";

const schema = z.object({
  title: z.string().trim().min(5, "Give it a descriptive title (5+ characters).").max(160, "Title is too long."),
  type: z.string().min(1, "Choose a type."),
  departmentId: z.string().min(1, "Choose a department."),
  courseId: z.string(),
  courseName: z.string().max(120, "Keep the course name under 120 characters."),
  semester: z.string(),
  year: z.string().refine((value) => value === "" || /^\d{4}$/.test(value), "Enter a 4-digit year."),
  description: z.string().max(1000, "Keep the description under 1000 characters."),
  tags: z.string().max(200, "Too many tags."),
});

type Values = z.infer<typeof schema>;

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Course {
  id: string;
  code: string;
  title: string;
  semester: number;
}

const DEFAULTS: Values = { title: "", type: "NOTES", departmentId: "", courseId: "", courseName: "", semester: "", year: "", description: "", tags: "" };

/** Upload a PDF (direct to UploadThing) then submit its metadata for moderation. */
export function UploadForm() {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<UploadedPdf | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });
  const departmentId = useWatch({ control, name: "departmentId" });
  const [customCourse, setCustomCourse] = useState(false);

  const departments = useQuery({ queryKey: ["departments"], queryFn: () => api.get<Department[]>("/api/departments"), staleTime: 3_600_000 });
  const courses = useQuery({
    queryKey: ["courses", departmentId],
    queryFn: () => api.get<Course[]>("/api/courses", { query: { departmentId } }),
    enabled: Boolean(departmentId),
    staleTime: 3_600_000,
  });

  const onSubmit = async (values: Values) => {
    if (!file) {
      setFileError("Attach the PDF first.");
      toast.error("Attach the PDF first.");
      return;
    }
    setFileError(null);
    const tags = values.tags
      .split(",")
      .map((tag) => tag.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
    const body = {
      title: values.title.trim(),
      type: values.type,
      departmentId: values.departmentId,
      fileUrl: file.url,
      fileKey: file.key,
      fileSize: file.size,
      mimeType: "application/pdf",
      ...(!customCourse && values.courseId ? { courseId: values.courseId } : {}),
      ...(customCourse && values.courseName.trim() ? { courseName: values.courseName.trim() } : {}),
      ...(values.semester ? { semester: Number(values.semester) } : {}),
      ...(values.year ? { year: Number(values.year) } : {}),
      ...(values.description.trim() ? { description: values.description.trim() } : {}),
      ...(tags.length ? { tags } : {}),
    };
    try {
      const result = await toastPromise(api.post<{ message: string }>("/api/resources", body), { loading: "Submitting for review…", success: (data) => (data as { message: string }).message });
      await queryClient.invalidateQueries({ queryKey: ["me", "resources"] });
      setSubmitted(result.message);
    } catch (error) {
      applyServerErrors(error, setError, ["title", "departmentId", "courseId", "semester", "year", "description", "tags"]);
    }
  };

  if (submitted) {
    return (
      <div className="mx-auto max-w-lg rounded-3xl border border-border bg-surface p-8 text-center shadow-md">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-success-soft text-success">
          <CheckCircle2 className="size-8" />
        </div>
        <h2 className="font-display text-h3 font-bold">Thank you for sharing!</h2>
        <p className="mt-2 text-fg-muted">{submitted}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              reset(DEFAULTS);
              setFile(null);
              setSubmitted(null);
            }}
          >
            Upload another
          </Button>
          <Button asChild variant="gradient">
            <Link href="/dashboard/my-resources">Track my uploads</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-5">
        <Field label="Title" error={errors.title?.message} required>
          <Input placeholder="e.g. CSE-2101 Data Structures - Midterm 2025" {...register("title")} />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Type" error={errors.type?.message} required>
            <Select {...register("type")}>
              {optionsOf(RESOURCE_TYPE).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Department" error={errors.departmentId?.message} required>
            <Select
              {...register("departmentId", {
                onChange: () => setValue("courseId", ""),
              })}
            >
              <option value="">Select department</option>
              {departments.data?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.code} - {dept.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {customCourse ? (
          <Field label="Course name" error={errors.courseName?.message} hint="Optional - type it the way students know it, e.g. CSE 4101 · Machine Learning.">
            <Input placeholder="Course code and title" maxLength={120} {...register("courseName")} />
          </Field>
        ) : (
        <Field label="Course" error={errors.courseId?.message} hint={departmentId ? "Optional - helps others find it by course code." : "Choose a department first."}>
          <Controller
            control={control}
            name="courseId"
            render={({ field }) => (
              <Combobox
                options={[{ value: "", label: "No specific course" }, ...(courses.data?.map((course) => ({ value: course.id, label: `${course.code} · ${course.title}`, hint: `Semester ${course.semester}` })) ?? [])]}
                value={field.value}
                onChange={(value) => field.onChange(value ?? "")}
                placeholder="Search courses"
                disabled={!departmentId}
              />
            )}
          />
        </Field>
        )}
        <button
          type="button"
          className="-mt-2 self-start text-sm font-semibold text-primary hover:underline"
          onClick={() => {
            setCustomCourse((value) => !value);
            setValue("courseId", "");
            setValue("courseName", "");
          }}
        >
          {customCourse ? "Pick from the course list instead" : "My course is not listed"}
        </button>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Semester" error={errors.semester?.message}>
            <Select {...register("semester")}>
              <option value="">Not specified</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i + 1}>
                  Semester {i + 1}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Year" error={errors.year?.message}>
            <Input inputMode="numeric" placeholder={String(new Date().getFullYear())} maxLength={4} {...register("year")} />
          </Field>
        </div>
        <Field label="Description" error={errors.description?.message} hint="What is inside? Chapters, exam term, handwritten or typed…">
          <Textarea rows={4} {...register("description")} />
        </Field>
        <Field label="Tags" error={errors.tags?.message} hint="Comma separated, up to 10 - e.g. dbms, sql, midterm">
          <Input placeholder="dbms, sql, midterm" {...register("tags")} />
        </Field>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <div>
          <p className="mb-1.5 text-sm font-semibold">
            PDF file<span className="ml-0.5 text-danger" aria-hidden>*</span>
          </p>
          <PdfDropzone
            value={file}
            onChange={(next) => {
              setFile(next);
              if (next) setFileError(null);
            }}
          />
          {fileError && (
            <p role="alert" className="mt-2 text-sm font-medium text-danger">
              {fileError}
            </p>
          )}
        </div>
        <p className="rounded-xl bg-surface-2 p-4 text-sm text-fg-muted">A moderator reviews every upload before it appears in search. You will get a notification either way.</p>
        <Button type="submit" size="lg" variant="gradient" className="w-full" loading={isSubmitting}>
          Submit for review
        </Button>
      </div>
    </form>
  );
}
