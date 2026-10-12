"use client";

import { BusFront, CalendarOff, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { AdminList, AdminPage, Panel } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { CAMPUS_WEEK_ORDER, describeOffDays, describeWorkingDays, getDhakaDateKey, isBusWeekday, isWorkingWeekday, weekdayName, weekdayOfDateKey } from "@/config/campus-calendar";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api, fieldErrors } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ClosureRow {
  id: string;
  /** `YYYY-MM-DD` (Dhaka calendar). */
  date: string;
  title: string;
  closesCampus: boolean;
  suspendsBus: boolean;
  note: string | null;
}

interface ClosureValues {
  date: string;
  title: string;
  closesCampus: boolean;
  suspendsBus: boolean;
  note: string;
}

const EMPTY: ClosureValues = { date: "", title: "", closesCampus: true, suspendsBus: true, note: "" };

function WeeklyRule() {
  return (
    <Panel title="Weekly rule" description={`City University is open ${describeWorkingDays()}. ${describeOffDays()} are weekly off days with no bus service. This is the same rule the bus pages, chatbot, events and reminders use.`}>
      <ul className="grid grid-cols-7 gap-2" aria-label="Weekly rule">
        {CAMPUS_WEEK_ORDER.map((weekday) => {
          const open = isWorkingWeekday(weekday);
          return (
            <li key={weekday} className={cn("flex min-w-0 flex-col items-center gap-1 rounded-xl border p-2 text-center text-xs sm:p-3 sm:text-sm", open ? "border-border bg-surface" : "border-dashed border-border bg-surface-2 text-fg-subtle")}>
              <span className="font-semibold">{weekdayName(weekday).slice(0, 3)}</span>
              <Badge tone={open ? "success" : "neutral"}>{open ? "Open" : "Off day"}</Badge>
              <span className="flex items-center gap-1 text-[0.7rem]">
                <BusFront className="size-3" aria-hidden /> {isBusWeekday(weekday) ? "Bus runs" : "No bus"}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

function ClosureDialog({ closure, onClose, onSave }: { closure: ClosureRow | null; onClose: () => void; onSave: (payload: Record<string, unknown>, id?: string) => Promise<unknown> }) {
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<ClosureValues>({ defaultValues: closure ? { date: closure.date, title: closure.title, closesCampus: closure.closesCampus, suspendsBus: closure.suspendsBus, note: closure.note ?? "" } : EMPTY });
  const date = useWatch({ control, name: "date" });
  const weekly = /^\d{4}-\d{2}-\d{2}$/.test(date) && !isWorkingWeekday(weekdayOfDateKey(date));

  const submit = handleSubmit(async (values) => {
    if (!values.closesCampus && !values.suspendsBus) {
      setError("closesCampus", { message: "Choose at least one: close the campus or suspend the bus." });
      return;
    }
    const payload = { date: values.date, title: values.title, closesCampus: values.closesCampus, suspendsBus: values.suspendsBus, note: values.note.trim() ? values.note.trim() : null };
    try {
      await onSave(payload, closure?.id);
      onClose();
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof ClosureValues, { message });
    }
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title={closure ? "Edit closure" : "New closure"}
      description="A holiday or special change on one date. It overrides the weekly rule for that day."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={isSubmitting}>
            {closure ? "Save closure" : "Add closure"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Date" required error={errors.date?.message} hint={weekly ? "This date is already a weekly off day; the closure only adds a note." : undefined}>
          <Input type="date" {...register("date", { required: "Pick a date." })} data-autofocus />
        </Field>
        <Field label="Title" required error={errors.title?.message}>
          <Input {...register("title", { required: "Add a title, e.g. Victory Day." })} maxLength={120} />
        </Field>
        <div className="space-y-2">
          <Checkbox label="University closed" description="Classes and offices are closed that day." {...register("closesCampus")} />
          <Checkbox label="No bus service" description="Buses do not run; the next-bus finder and chatbot skip this date." {...register("suspendsBus")} />
          {errors.closesCampus?.message && <p className="text-xs font-medium text-danger">{errors.closesCampus.message}</p>}
        </div>
        <Field label="Note" error={errors.note?.message} hint="Optional. Shown to admins only.">
          <Textarea {...register("note")} rows={3} maxLength={300} />
        </Field>
      </form>
    </Dialog>
  );
}

/** Admin: weekly rule (read-only) plus special closures with create, edit and delete. */
export function CalendarAdmin() {
  const [editing, setEditing] = useState<ClosureRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<ClosureRow | null>(null);
  const [today] = useState(() => getDhakaDateKey(new Date()));
  const closures = useAdminCollection<ClosureRow>("calendar-closures", "/api/admin/calendar/closures");

  const save = (payload: Record<string, unknown>, id?: string) =>
    closures.mutate({
      request: () => (id ? api.patch<ClosureRow>(`/api/admin/calendar/closures/${id}`, payload) : api.post<ClosureRow>("/api/admin/calendar/closures", payload)),
      loading: id ? "Saving closure…" : "Adding closure…",
      success: id ? "Closure saved." : "Closure added.",
      publicSite: true,
    });

  const columns: Array<Column<ClosureRow>> = [
    {
      key: "date",
      header: "Date",
      sortValue: (row) => row.date,
      cell: (row) => (
        <div>
          <p className="font-semibold tabular-nums">{row.date}</p>
          <p className="text-xs text-fg-subtle">{weekdayName(weekdayOfDateKey(row.date))}</p>
        </div>
      ),
    },
    { key: "title", header: "Title", sortValue: (row) => row.title.toLowerCase(), cell: (row) => <span className="font-semibold">{row.title}</span> },
    {
      key: "effect",
      header: "Effect",
      cell: (row) => (
        <div className="flex flex-wrap gap-1.5">
          {row.closesCampus && <Badge tone="warning">Campus closed</Badge>}
          {row.suspendsBus && <Badge tone="neutral">No bus</Badge>}
          {row.date < today && <Badge>Past</Badge>}
        </div>
      ),
    },
    { key: "note", header: "Note", cell: (row) => <span className="line-clamp-2 max-w-xs text-sm text-fg-muted">{row.note ?? "-"}</span> },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
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
      title="Campus calendar"
      description="Special closures on top of the weekly rule. Changes update the bus pages, next-bus finder, chatbot and events immediately."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus /> New closure
        </Button>
      }
    >
      <WeeklyRule />
      <AdminList
        list={closures}
        columns={columns}
        caption="Special closures"
        emptyTitle="No special closures"
        emptyDescription="Add a public holiday or exam-day bus change."
        emptyAction={
          <Button onClick={() => setEditing("new")}>
            <CalendarOff /> New closure
          </Button>
        }
      />
      {editing && <ClosureDialog key={editing === "new" ? "new" : editing.id} closure={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this closure?"
        description={`${deleting?.title ?? ""} on ${deleting?.date ?? ""} stops overriding the weekly rule: the campus and the bus follow the normal week again.`}
        confirmLabel="Delete closure"
        destructive
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void closures.mutate({ request: () => api.delete(`/api/admin/calendar/closures/${target.id}`), loading: "Deleting…", success: "Closure deleted.", publicSite: true }, closures.removeItem(target.id)).catch(() => undefined);
        }}
      />
    </AdminPage>
  );
}
