"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type CourseOption, type DepartmentOption, useCourseOptions, useDepartmentOptions } from "@/components/admin/admin-hooks";
import { AdminPage, Panel } from "@/components/admin/kit";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs } from "@/components/ui/tabs";
import { api, fieldErrors } from "@/lib/api-client";
import { toastPromise } from "@/lib/toast";

type Department = DepartmentOption & { faculty?: string | null };

interface DepartmentValues {
  code: string;
  name: string;
  faculty: string;
}

interface CourseValues {
  code: string;
  title: string;
  departmentId: string;
  semester: string;
  credits: string;
}

/** Runs a save with toast + cache refresh; returns the field errors on validation failure. */
function useSave() {
  const queryClient = useQueryClient();
  return async (request: () => Promise<unknown>, messages: { loading: string; success: string }) => {
    await toastPromise(request(), { loading: messages.loading, success: `${messages.success} Public site updated ✓` });
    await queryClient.invalidateQueries({ queryKey: ["departments"] });
    await queryClient.invalidateQueries({ queryKey: ["admin", "course-options"] });
  };
}

function DepartmentDialog({ department, onClose }: { department: Department | null; onClose: () => void }) {
  const save = useSave();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DepartmentValues>({ defaultValues: { code: department?.code ?? "", name: department?.name ?? "", faculty: department?.faculty ?? "" } });
  const submit = handleSubmit(async (values) => {
    const payload = { code: values.code, name: values.name, faculty: values.faculty || null };
    try {
      await save(() => (department ? api.patch(`/api/admin/departments/${department.id}`, payload) : api.post("/api/admin/departments", payload)), { loading: "Saving department…", success: "Department saved." });
      onClose();
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof DepartmentValues, { message });
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={department ? "Edit department" : "New department"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Code" required hint="2-16 letters, e.g. CSE." error={errors.code?.message}>
          <Input {...register("code", { required: "Add a code." })} maxLength={16} className="uppercase" />
        </Field>
        <Field label="Name" required error={errors.name?.message}>
          <Input {...register("name", { required: "Add a name." })} maxLength={120} />
        </Field>
        <Field label="Faculty" error={errors.faculty?.message}>
          <Input {...register("faculty")} maxLength={120} />
        </Field>
      </form>
    </Dialog>
  );
}

function CourseDialog({ course, departments, onClose }: { course: CourseOption | null; departments: Department[]; onClose: () => void }) {
  const save = useSave();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CourseValues>({ defaultValues: { code: course?.code ?? "", title: course?.title ?? "", departmentId: course?.departmentId ?? departments[0]?.id ?? "", semester: course?.semester.toString() ?? "1", credits: "" } });
  const submit = handleSubmit(async (values) => {
    const payload = { code: values.code, title: values.title, departmentId: values.departmentId, semester: Number(values.semester), credits: values.credits ? Number(values.credits) : null };
    try {
      await save(() => (course ? api.patch(`/api/admin/courses/${course.id}`, payload) : api.post("/api/admin/courses", payload)), { loading: "Saving course…", success: "Course saved." });
      onClose();
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof CourseValues, { message });
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={course ? "Edit course" : "New course"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={isSubmitting}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Code" required hint="e.g. CSE-2101" error={errors.code?.message}>
          <Input {...register("code", { required: "Add a course code." })} maxLength={16} className="uppercase" />
        </Field>
        <Field label="Department" required error={errors.departmentId?.message}>
          <Select {...register("departmentId")}>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.code} · {department.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" required className="sm:col-span-2" error={errors.title?.message}>
          <Input {...register("title", { required: "Add a title." })} maxLength={200} />
        </Field>
        <Field label="Semester" required error={errors.semester?.message}>
          <Input type="number" min={1} max={12} {...register("semester", { required: true })} />
        </Field>
        <Field label="Credits" error={errors.credits?.message}>
          <Input type="number" step="0.5" min={0.5} max={6} {...register("credits")} />
        </Field>
      </form>
    </Dialog>
  );
}

export function AcademicsAdmin() {
  const [tab, setTab] = useState<"departments" | "courses">("departments");
  const [department, setDepartment] = useState<Department | "new" | null>(null);
  const [course, setCourse] = useState<CourseOption | "new" | null>(null);
  const [deleting, setDeleting] = useState<{ kind: "departments" | "courses"; id: string; label: string } | null>(null);
  const [filterDepartment, setFilterDepartment] = useState("");
  const save = useSave();
  const departments = useDepartmentOptions();
  const courses = useCourseOptions(filterDepartment || undefined);

  const confirmDelete = () => {
    const target = deleting;
    setDeleting(null);
    if (target) void save(() => api.delete(`/api/admin/${target.kind}/${target.id}`), { loading: "Deleting…", success: `${target.label} deleted.` }).catch(() => undefined);
  };

  return (
    <AdminPage
      title="Departments & courses"
      description="The academic structure behind resources, notices and student profiles."
      actions={
        <Button onClick={() => (tab === "departments" ? setDepartment("new") : setCourse("new"))}>
          <Plus /> {tab === "departments" ? "New department" : "New course"}
        </Button>
      }
    >
      <Tabs
        label="Academic data"
        value={tab}
        onValueChange={setTab}
        items={[
          { value: "departments", label: "Departments", count: departments.data?.length },
          { value: "courses", label: "Courses", count: courses.data?.length },
        ]}
      />
      {tab === "departments" ? (
        <Panel>
          {departments.isPending ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : departments.isError ? (
            <ErrorState error={departments.error} onRetry={() => void departments.refetch()} />
          ) : departments.data.length === 0 ? (
            <EmptyState title="No departments" />
          ) : (
            <ul className="divide-y divide-border">
              {departments.data.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-xs font-bold text-primary-soft-fg">{item.code}</span>
                  <span className="min-w-0 flex-1 truncate font-medium">{item.name}</span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${item.code}`} onClick={() => setDepartment(item)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Delete ${item.code}`} onClick={() => setDeleting({ kind: "departments", id: item.id, label: item.code })}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      ) : (
        <Panel>
          <div className="mb-4 max-w-xs">
            <Select aria-label="Filter courses by department" value={filterDepartment} onChange={(event) => setFilterDepartment(event.target.value)}>
              <option value="">All departments</option>
              {departments.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.code}
                </option>
              ))}
            </Select>
          </div>
          {courses.isPending ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : courses.isError ? (
            <ErrorState error={courses.error} onRetry={() => void courses.refetch()} />
          ) : courses.data.length === 0 ? (
            <EmptyState title="No courses" />
          ) : (
            <ul className="divide-y divide-border">
              {courses.data.map((item) => (
                <li key={item.id} className="flex items-center gap-3 py-3">
                  <span className="w-24 shrink-0 font-mono text-sm font-semibold">{item.code}</span>
                  <span className="min-w-0 flex-1 truncate">{item.title}</span>
                  <span className="shrink-0 text-xs text-fg-subtle">Sem {item.semester}</span>
                  <Button size="icon-sm" variant="ghost" aria-label={`Edit ${item.code}`} onClick={() => setCourse(item)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Delete ${item.code}`} onClick={() => setDeleting({ kind: "courses", id: item.id, label: item.code })}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
      {department && <DepartmentDialog key={department === "new" ? "new" : department.id} department={department === "new" ? null : department} onClose={() => setDepartment(null)} />}
      {course && departments.data && <CourseDialog key={course === "new" ? "new" : course.id} course={course === "new" ? null : course} departments={departments.data} onClose={() => setCourse(null)} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete ${deleting?.label ?? ""}?`}
        description="This fails safely if resources, notices or students still use it."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmDelete}
      />
    </AdminPage>
  );
}
