"use client";

import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useClubOptions } from "@/components/admin/admin-hooks";
import { AdminList, AdminPage } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api, fieldErrors } from "@/lib/api-client";
import { dhakaLocalToIso, isoToDhakaLocal } from "@/lib/dhaka";
import { formatDateTime } from "@/lib/format";

interface FormRow {
  id: string;
  title: string;
  description: string | null;
  url: string;
  deadline: string | null;
  isOpen: boolean;
  clubId: string | null;
  club: { name: string } | null;
}

interface FormValues {
  title: string;
  description: string;
  url: string;
  deadline: string;
  clubId: string;
}

function FormDialog({ form, onClose, onSave }: { form: FormRow | null; onClose: () => void; onSave: (payload: Record<string, unknown>, id?: string) => Promise<unknown> }) {
  const clubs = useClubOptions();
  const [open, setOpen] = useState(form?.isOpen ?? true);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ defaultValues: { title: form?.title ?? "", description: form?.description ?? "", url: form?.url ?? "https://", deadline: isoToDhakaLocal(form?.deadline), clubId: form?.clubId ?? "" } });
  const submit = handleSubmit(async (values) => {
    const payload = { title: values.title, description: values.description || null, url: values.url, deadline: values.deadline ? dhakaLocalToIso(values.deadline) : null, clubId: values.clubId || null, isOpen: open };
    try {
      await onSave(payload, form?.id);
      onClose();
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof FormValues, { message });
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title={form ? "Edit form link" : "New form link"}
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
        <Field label="Title" required error={errors.title?.message}>
          <Input {...register("title", { required: "Add a title." })} maxLength={200} data-autofocus />
        </Field>
        <Field label="Link (https)" required hint="A Google Form or any https sign-up page." error={errors.url?.message}>
          <Input type="url" {...register("url", { required: "Add the link." })} maxLength={500} />
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <Textarea {...register("description")} rows={3} maxLength={1000} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Deadline (Dhaka time)" error={errors.deadline?.message}>
            <Input type="datetime-local" {...register("deadline")} />
          </Field>
          <Field label="Club" error={errors.clubId?.message}>
            <Select {...register("clubId")}>
              <option value="">Not tied to a club</option>
              {clubs.data?.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Switch checked={open} onCheckedChange={setOpen} label="Accepting responses" description="Closed forms stay listed but are marked closed." />
      </form>
    </Dialog>
  );
}

export function FormsAdmin() {
  const [editing, setEditing] = useState<FormRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<FormRow | null>(null);
  const forms = useAdminCollection<FormRow>("forms", "/api/admin/forms");

  const save = (payload: Record<string, unknown>, id?: string) =>
    forms.mutate({ request: () => (id ? api.patch(`/api/admin/forms/${id}`, payload) : api.post("/api/admin/forms", payload)), loading: "Saving form…", success: id ? "Form saved." : "Form added.", publicSite: true });

  const toggleOpen = (row: FormRow) =>
    forms.mutate({ request: () => api.patch(`/api/admin/forms/${row.id}`, { isOpen: !row.isOpen }), loading: "Updating…", success: row.isOpen ? "Form closed." : "Form reopened.", publicSite: true }, forms.patchItem(row.id, { isOpen: !row.isOpen })).catch(() => undefined);

  const columns: Array<Column<FormRow>> = [
    {
      key: "title",
      header: "Form",
      sortValue: (row) => row.title.toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="max-w-md truncate font-semibold">{row.title}</p>
          <a href={row.url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-md items-center gap-1 truncate text-xs text-primary hover:underline">
            {row.url} <ExternalLink className="size-3" aria-hidden />
          </a>
        </div>
      ),
    },
    { key: "club", header: "Club", cell: (row) => row.club?.name ?? "-" },
    { key: "deadline", header: "Deadline", cell: (row) => (row.deadline ? formatDateTime(row.deadline) : "None"), sortValue: (row) => row.deadline ?? "" },
    { key: "open", header: "Status", cell: (row) => <Switch checked={row.isOpen} onCheckedChange={() => void toggleOpen(row)} label={<Badge tone={row.isOpen ? "success" : "neutral"}>{row.isOpen ? "Open" : "Closed"}</Badge>} /> },
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
      title="Forms"
      description="Central list of sign-up and registration forms."
      actions={
        <Button onClick={() => setEditing("new")}>
          <Plus /> New form
        </Button>
      }
    >
      <AdminList list={forms} columns={columns} caption="Form links" emptyTitle="No forms yet" emptyDescription="Add a Google Form link so students find it in one place." />
      {editing && <FormDialog key={editing === "new" ? "new" : editing.id} form={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSave={save} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this form link?"
        description={`“${deleting?.title ?? ""}” is removed from the public forms page.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void forms.mutate({ request: () => api.delete(`/api/admin/forms/${target.id}`), loading: "Deleting…", success: "Form deleted.", publicSite: true }, forms.removeItem(target.id)).catch(() => undefined);
        }}
      />
    </AdminPage>
  );
}
