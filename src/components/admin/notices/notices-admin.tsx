"use client";

import { Megaphone, Pencil, Pin, Plus, Siren, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useCourseOptions, useDepartmentOptions } from "@/components/admin/admin-hooks";
import { AdminList, AdminPage, Toolbar } from "@/components/admin/kit";
import { OffDayNotice } from "@/components/admin/off-day-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { addDaysToDateKey, getDhakaDateKey } from "@/config/campus-calendar";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api, fieldErrors } from "@/lib/api-client";
import { dhakaLocalToIso, isoToDhakaLocal } from "@/lib/dhaka";
import { formatDateTime } from "@/lib/format";
import { labelOf, NOTICE_CATEGORY, optionsOf } from "@/lib/labels";

interface NoticeRow {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  expiresAt: string | null;
  departmentId: string | null;
  courseId: string | null;
  createdAt: string;
  createdBy: { name: string };
}

interface NoticeValues {
  title: string;
  body: string;
  category: string;
  departmentId: string;
  courseId: string;
  expiresAt: string;
}

/** Tomorrow 23:59 (Dhaka) as a datetime-local value: a cancellation notice stays visible through the next day. */
function tomorrowEnd(): string {
  return `${addDaysToDateKey(getDhakaDateKey(new Date()), 1)}T23:59`;
}

const CANCEL_TEMPLATE: NoticeValues = {
  title: "Class cancelled: ",
  body: "Today's class is cancelled. A makeup class will be announced separately. Please check this notice board for updates.",
  category: "CLASS_CANCELLATION",
  departmentId: "",
  courseId: "",
  expiresAt: "",
};

function NoticeDialog({ notice, template, onClose, onSave }: { notice: NoticeRow | null; template: boolean; onClose: () => void; onSave: (payload: Record<string, unknown>, id?: string) => Promise<unknown> }) {
  const departments = useDepartmentOptions();
  const [pinned, setPinned] = useState(notice?.pinned ?? template);
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<NoticeValues>({
    defaultValues: notice
      ? { title: notice.title, body: notice.body, category: notice.category, departmentId: notice.departmentId ?? "", courseId: notice.courseId ?? "", expiresAt: isoToDhakaLocal(notice.expiresAt) }
      : template
        ? { ...CANCEL_TEMPLATE, expiresAt: tomorrowEnd() }
        : { title: "", body: "", category: "GENERAL", departmentId: "", courseId: "", expiresAt: "" },
  });
  const departmentId = useWatch({ control, name: "departmentId" });
  const category = useWatch({ control, name: "category" });
  const expiresAt = useWatch({ control, name: "expiresAt" });
  const [todayKey] = useState(() => getDhakaDateKey(new Date()));
  const courses = useCourseOptions(departmentId || undefined);
  const urgentish = category === "CLASS_CANCELLATION" || category === "URGENT";

  const submit = handleSubmit(async (values) => {
    const payload = {
      title: values.title,
      body: values.body,
      category: values.category,
      departmentId: values.departmentId || null,
      courseId: values.courseId || null,
      pinned,
      expiresAt: values.expiresAt ? dhakaLocalToIso(values.expiresAt) : null,
    };
    try {
      await onSave(payload, notice?.id);
      onClose();
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof NoticeValues, { message });
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={notice ? "Edit notice" : template ? "Class cancellation notice" : "New notice"}
      description={urgentish ? "Students of the chosen department, and anyone following the department or course, are notified immediately." : undefined}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={isSubmitting}>
            {notice ? "Save notice" : "Post notice"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Title" required error={errors.title?.message}>
          <Input {...register("title", { required: "Add a title." })} maxLength={200} data-autofocus />
        </Field>
        <Field label="Message" required error={errors.body?.message}>
          <Textarea {...register("body", { required: "Add the message." })} rows={5} maxLength={10000} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Category" required>
            <Select {...register("category")}>
              {optionsOf(NOTICE_CATEGORY).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Visible until (Dhaka time)" hint="Optional. The notice hides itself afterwards." error={errors.expiresAt?.message}>
            <Input type="datetime-local" {...register("expiresAt")} />
          </Field>
          <Field label="Department" hint="Leave empty for the whole campus (no push)." error={errors.departmentId?.message}>
            <Select {...register("departmentId")}>
              <option value="">All departments</option>
              {departments.data?.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.code} · {department.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Course" error={errors.courseId?.message}>
            <Select {...register("courseId")} disabled={!departmentId}>
              <option value="">Whole department</option>
              {courses.data?.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} · {course.title}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        {category === "CLASS_CANCELLATION" && <OffDayNotice dateKey={expiresAt ? expiresAt.slice(0, 10) : todayKey} subject="class notice" />}
        <Switch checked={pinned} onCheckedChange={setPinned} label="Pin to the top" description="Pinned notices stay first on the board and the landing ticker." />
      </form>
    </Dialog>
  );
}

export function NoticesAdmin() {
  const params = useSearchParams();
  const [editing, setEditing] = useState<NoticeRow | "new" | "template" | null>(params.get("template") === "class-cancel" ? "template" : null);
  const [deleting, setDeleting] = useState<NoticeRow | null>(null);
  const [category, setCategory] = useState("");
  const notices = useAdminCollection<NoticeRow>("notices", "/api/admin/notices", { category });

  const save = (payload: Record<string, unknown>, id?: string) =>
    notices.mutate({
      request: () => (id ? api.patch<NoticeRow>(`/api/admin/notices/${id}`, payload) : api.post<NoticeRow & { recipients: number }>("/api/admin/notices", payload)),
      loading: id ? "Saving notice…" : "Posting notice…",
      success: (result) => {
        const recipients = (result as { recipients?: number }).recipients;
        return id ? "Notice saved." : recipients ? `Notice posted. ${recipients.toLocaleString("en-US")} student${recipients === 1 ? "" : "s"} are being notified.` : "Notice posted.";
      },
      publicSite: true,
    });

  const togglePin = (row: NoticeRow) =>
    notices.mutate({ request: () => api.patch(`/api/admin/notices/${row.id}`, { pinned: !row.pinned }), loading: row.pinned ? "Unpinning…" : "Pinning…", success: row.pinned ? "Unpinned." : "Pinned to the top.", publicSite: true }, notices.patchItem(row.id, { pinned: !row.pinned })).catch(() => undefined);

  const columns: Array<Column<NoticeRow>> = [
    {
      key: "title",
      header: "Notice",
      sortValue: (row) => row.title.toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="flex max-w-md items-center gap-1.5 truncate font-semibold">
            {row.pinned && <Pin className="size-3.5 shrink-0 text-primary" aria-label="Pinned" />}
            <span className="truncate">{row.title}</span>
          </p>
          <p className="max-w-md truncate text-xs text-fg-subtle">{row.body}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (row) => <Badge tone={labelOf(NOTICE_CATEGORY, row.category).tone}>{labelOf(NOTICE_CATEGORY, row.category).label}</Badge> },
    { key: "posted", header: "Posted", cell: (row) => formatDateTime(row.createdAt), sortValue: (row) => row.createdAt },
    { key: "expires", header: "Visible until", cell: (row) => (row.expiresAt ? (new Date(row.expiresAt) < new Date() ? <Badge>Expired</Badge> : formatDateTime(row.expiresAt)) : "No end") },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={row.pinned ? `Unpin ${row.title}` : `Pin ${row.title}`} title={row.pinned ? "Unpin" : "Pin"} onClick={() => void togglePin(row)}>
            <Pin className={row.pinned ? "fill-current text-primary" : undefined} />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${row.title}`} onClick={() => setEditing(row)}>
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Delete ${row.title}`} onClick={() => setDeleting(row)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage
      title="Notices"
      description="Announcements for students. Posting updates the notice board, the landing ticker and the chatbot immediately."
      actions={
        <>
          <Button variant="secondary" onClick={() => setEditing("template")}>
            <Siren /> Class cancelled
          </Button>
          <Button onClick={() => setEditing("new")}>
            <Plus /> New notice
          </Button>
        </>
      }
    >
      <AdminList
        list={notices}
        columns={columns}
        caption="Notices"
        emptyTitle="No notices yet"
        emptyDescription="Post the first announcement."
        emptyAction={<Button onClick={() => setEditing("new")}><Megaphone /> New notice</Button>}
        toolbar={
          <Toolbar>
            <Select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {optionsOf(NOTICE_CATEGORY).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Toolbar>
        }
      />
      {editing && <NoticeDialog key={typeof editing === "string" ? editing : editing.id} notice={typeof editing === "string" ? null : editing} template={editing === "template"} onClose={() => setEditing(null)} onSave={save} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this notice?"
        description={`“${deleting?.title ?? ""}” disappears from the notice board, the landing ticker and the chatbot.`}
        confirmLabel="Delete notice"
        destructive
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void notices.mutate({ request: () => api.delete(`/api/admin/notices/${target.id}`), loading: "Deleting…", success: "Notice deleted.", publicSite: true }, notices.removeItem(target.id)).catch(() => undefined);
        }}
      />
    </AdminPage>
  );
}
