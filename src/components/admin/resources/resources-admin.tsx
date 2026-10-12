"use client";

import { Check, Eye, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { AdminList, AdminPage, ReasonDialog, Toolbar } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { Tabs } from "@/components/ui/tabs";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api, fieldErrors } from "@/lib/api-client";
import { formatBytes, formatDate } from "@/lib/format";
import { labelOf, MODERATION_STATUS, RESOURCE_TYPE, optionsOf } from "@/lib/labels";

type Status = "PENDING" | "APPROVED" | "REJECTED";

interface ResourceRow {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: Status;
  rejectionReason: string | null;
  downloadCount: number;
  createdAt: string;
  fileUrl: string | null;
  fileSize: number;
  mimeType: string | null;
  department: { code: string };
  course: { code: string } | null;
  uploadedBy: { id: string; name: string; email: string; studentId: string | null };
}

/** What the console can show for a resource: a PDF or an image. Anything else (or no file) has no preview at all. */
function previewKind(row: Pick<ResourceRow, "fileUrl" | "mimeType">): "pdf" | "image" | null {
  if (!row.fileUrl) return null;
  if (row.mimeType === "application/pdf") return "pdf";
  if (row.mimeType?.startsWith("image/")) return "image";
  return null;
}

interface EditValues {
  title: string;
  description: string;
  type: string;
}

function EditDialog({ row, onClose, onSave }: { row: ResourceRow; onClose: () => void; onSave: (payload: Record<string, unknown>) => Promise<unknown> }) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>({ defaultValues: { title: row.title, description: row.description ?? "", type: row.type } });
  const submit = handleSubmit(async (values) => {
    try {
      await onSave({ title: values.title, description: values.description || null, type: values.type });
      onClose();
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof EditValues, { message });
    }
  });
  return (
    <Dialog
      open
      onClose={onClose}
      title="Edit resource details"
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
          <Input {...register("title", { required: "Add a title." })} maxLength={200} />
        </Field>
        <Field label="Type">
          <Select {...register("type")}>
            {optionsOf(RESOURCE_TYPE).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" error={errors.description?.message}>
          <Textarea {...register("description")} rows={4} maxLength={2000} />
        </Field>
      </form>
    </Dialog>
  );
}

export function ResourcesAdmin() {
  const [status, setStatus] = useState<Status>("PENDING");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<ResourceRow | null>(null);
  const [rejecting, setRejecting] = useState<ResourceRow[] | null>(null);
  const [editing, setEditing] = useState<ResourceRow | null>(null);
  const [deleting, setDeleting] = useState<ResourceRow | null>(null);
  const resources = useAdminCollection<ResourceRow>("resources", "/api/admin/resources", { status, q });

  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const approve = (rows: ResourceRow[]) => {
    const ids = rows.map((row) => row.id);
    setSelected(new Set());
    return resources
      .mutate(
        {
          request: () => (ids.length === 1 ? api.patch(`/api/admin/resources/${ids[0]}/review`, { decision: "APPROVE" }) : api.patch<{ failed: unknown[] }>("/api/admin/resources/bulk", { ids, decision: "APPROVE" })),
          loading: ids.length === 1 ? "Approving…" : `Approving ${ids.length} resources…`,
          success: ids.length === 1 ? `Approved “${rows[0].title}”. The uploader was notified.` : `${ids.length} resources processed.`,
          publicSite: true,
        },
        (items) => items.filter((item) => !ids.includes(item.id)),
      )
      .catch(() => undefined);
  };

  const reject = (rows: ResourceRow[], reason: string) => {
    const ids = rows.map((row) => row.id);
    setSelected(new Set());
    return resources.mutate(
      {
        request: () => (ids.length === 1 ? api.patch(`/api/admin/resources/${ids[0]}/review`, { decision: "REJECT", reason }) : api.patch("/api/admin/resources/bulk", { ids, decision: "REJECT", reason })),
        loading: "Rejecting…",
        success: `${ids.length} resource${ids.length === 1 ? "" : "s"} rejected. Uploaders were notified.`,
      },
      (items) => items.filter((item) => !ids.includes(item.id)),
    );
  };

  const save = (row: ResourceRow, payload: Record<string, unknown>) =>
    resources.mutate({ request: () => api.patch(`/api/admin/resources/${row.id}`, payload), loading: "Saving…", success: "Resource updated.", publicSite: true }, resources.patchItem(row.id, payload as Partial<ResourceRow>));

  const remove = (row: ResourceRow) =>
    resources.mutate({ request: () => api.delete(`/api/admin/resources/${row.id}`), loading: "Deleting…", success: "Resource deleted. Links to it now show not found.", publicSite: true }, resources.removeItem(row.id)).catch(() => undefined);

  const pending = status === "PENDING";
  const chosen = resources.items.filter((row) => selected.has(row.id));

  const columns: Array<Column<ResourceRow>> = [
    ...(pending
      ? [
          {
            key: "select",
            header: "Pick",
            cell: (row: ResourceRow) => <Checkbox label={<span className="sr-only">Select {row.title}</span>} checked={selected.has(row.id)} onChange={() => toggle(row.id)} />,
          },
        ]
      : []),
    {
      key: "title",
      header: "Resource",
      sortValue: (row) => row.title.toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="max-w-sm truncate font-semibold">{row.title}</p>
          <p className="text-xs text-fg-subtle">
            {[row.course?.code ?? row.department.code, labelOf(RESOURCE_TYPE, row.type).label, formatBytes(row.fileSize)].join(" · ")}
          </p>
        </div>
      ),
    },
    {
      key: "uploader",
      header: "Uploaded by",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.uploadedBy.name}</p>
          <p className="truncate text-xs text-fg-subtle">{row.uploadedBy.studentId ?? row.uploadedBy.email}</p>
        </div>
      ),
    },
    { key: "date", header: "Submitted", cell: (row) => formatDate(row.createdAt), sortValue: (row) => row.createdAt },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <div>
          <Badge tone={labelOf(MODERATION_STATUS, row.status).tone}>{labelOf(MODERATION_STATUS, row.status).label}</Badge>
          {row.rejectionReason && <p className="mt-0.5 max-w-48 truncate text-xs text-fg-subtle" title={row.rejectionReason}>{row.rejectionReason}</p>}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex flex-nowrap justify-end gap-1">
          {previewKind(row) && (
            <Button size="icon-sm" variant="ghost" aria-label={`Preview ${row.title}`} title="Preview file" onClick={() => setPreview(row)}>
              <Eye />
            </Button>
          )}
          {row.status === "PENDING" && (
            <>
              <Button size="icon-sm" variant="soft" aria-label={`Approve ${row.title}`} title="Approve" onClick={() => void approve([row])}>
                <Check />
              </Button>
              <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Reject ${row.title}`} title="Reject" onClick={() => setRejecting([row])}>
                <X />
              </Button>
            </>
          )}
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${row.title}`} title="Edit details" onClick={() => setEditing(row)}>
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Delete ${row.title}`} title="Delete" onClick={() => setDeleting(row)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage title="Resources" description="Review student uploads before they go public, and manage everything already published.">
      <AdminList
        list={resources}
        columns={columns}
        caption="Resources"
        emptyTitle={pending ? "The queue is empty" : "Nothing here"}
        emptyDescription={pending ? "New uploads waiting for review appear here." : undefined}
        toolbar={
          <div className="space-y-3">
            <Tabs
              label="Resource status"
              value={status}
              onValueChange={(next) => {
                setStatus(next);
                setSelected(new Set());
              }}
              items={[
                { value: "PENDING", label: "Pending review" },
                { value: "APPROVED", label: "Published" },
                { value: "REJECTED", label: "Rejected" },
              ]}
            />
            <Toolbar>
              <SearchBar value={q} onSearch={setQ} placeholder="Search by title…" label="Search resources" />
              {pending && chosen.length > 0 && (
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Bulk actions">
                  <span className="text-sm text-fg-muted">{chosen.length} selected</span>
                  <Button size="sm" onClick={() => void approve(chosen)}>
                    <Check /> Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => setRejecting(chosen)}>
                    <X /> Reject
                  </Button>
                </div>
              )}
            </Toolbar>
          </div>
        }
      />
      <Dialog open={preview !== null} onClose={() => setPreview(null)} title={preview?.title ?? "Preview"} description={preview ? `${preview.uploadedBy.name} · ${formatBytes(preview.fileSize)}` : undefined} className="max-w-4xl">
        {preview && previewKind(preview) === "pdf" && <iframe src={`${preview.fileUrl}#toolbar=1&view=FitH`} title={`PDF preview: ${preview.title}`} className="h-[65dvh] w-full rounded-xl border border-border bg-surface-2" referrerPolicy="no-referrer" />}
        {/* eslint-disable-next-line @next/next/no-img-element -- moderation preview of an uploaded file; the size is unknown. */}
        {preview && previewKind(preview) === "image" && <img src={preview.fileUrl ?? undefined} alt={`Preview: ${preview.title}`} className="mx-auto max-h-[65dvh] rounded-xl border border-border bg-surface-2 object-contain" referrerPolicy="no-referrer" />}
        {preview && previewKind(preview) && (
          <p className="mt-3 text-center text-sm text-fg-muted">
            Not loading?{" "}
            <a href={preview.fileUrl ?? undefined} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline">
              Open the file in a new tab
            </a>
          </p>
        )}
      </Dialog>
      <ReasonDialog
        open={rejecting !== null}
        onClose={() => setRejecting(null)}
        title={`Reject ${rejecting?.length ?? 0} resource${rejecting?.length === 1 ? "" : "s"}?`}
        description="The uploader receives this reason so they can fix and resubmit."
        confirmLabel="Reject"
        label="Reason for rejecting"
        onConfirm={async (reason) => {
          if (rejecting) await reject(rejecting, reason);
        }}
      />
      {editing && <EditDialog row={editing} onClose={() => setEditing(null)} onSave={(payload) => save(editing, payload)} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this resource?"
        description={`“${deleting?.title ?? ""}” is removed from the Resource Hub and its links stop working.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void remove(target);
        }}
      />
    </AdminPage>
  );
}
