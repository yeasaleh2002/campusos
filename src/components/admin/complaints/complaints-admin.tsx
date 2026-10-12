"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { EyeOff, Lock, MessageSquare, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { AdminList, AdminPage, Toolbar } from "@/components/admin/kit";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import type { Column } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { Sheet } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Timeline, type TimelineItem } from "@/components/ui/timeline";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api } from "@/lib/api-client";
import { formatDateTime, formatRelative } from "@/lib/format";
import { COMPLAINT_CATEGORY, COMPLAINT_PRIORITY, COMPLAINT_STATUS, labelOf, optionsOf } from "@/lib/labels";
import { toastPromise } from "@/lib/toast";

type Status = "RECEIVED" | "IN_REVIEW" | "RESOLVED" | "REJECTED";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface ComplaintRow {
  id: string;
  ticketNo: string;
  category: string;
  subject: string;
  status: Status;
  priority: Priority;
  isAnonymous: boolean;
  createdAt: string;
  user: { id: string; name: string; email: string; studentId: string | null } | null;
  assignedTo: { id: string; name: string } | null;
}

interface ComplaintDetail extends ComplaintRow {
  description: string;
  attachmentUrls: string[];
  updates: Array<{ id: string; status: Status | null; note: string | null; isInternal: boolean; createdAt: string; byUser: { id: string; name: string } | null }>;
}

function ComplaintSheet({ row, onClose }: { row: ComplaintRow | null; onClose: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const detail = useQuery({ queryKey: ["admin", "complaint", row?.id], enabled: row !== null, queryFn: () => api.get<ComplaintDetail>(`/api/admin/complaints/${row?.id}`) });

  const send = async (patch: Record<string, unknown>, messages: { loading: string; success: string }) => {
    setBusy(true);
    try {
      await toastPromise(api.patch(`/api/admin/complaints/${row?.id}`, patch), messages);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["admin", "complaint", row?.id] }), queryClient.invalidateQueries({ queryKey: ["admin", "complaints"] })]);
      return true;
    } catch {
      return false;
    } finally {
      setBusy(false);
    }
  };

  const timeline: TimelineItem[] =
    detail.data?.updates.map((update) => ({
      id: update.id,
      title: (
        <span className="flex flex-wrap items-center gap-2">
          {update.status ? `Status → ${labelOf(COMPLAINT_STATUS, update.status).label}` : update.isInternal ? "Internal note" : "Reply to student"}
          {update.isInternal && (
            <Badge tone="warning">
              <Lock /> Internal
            </Badge>
          )}
        </span>
      ),
      description: update.note ? <span className="whitespace-pre-line">{update.note}</span> : undefined,
      meta: `${update.byUser?.name ?? "Complainant"} · ${formatRelative(update.createdAt)}`,
      tone: update.isInternal ? "warning" : update.status === "RESOLVED" ? "success" : "primary",
    })) ?? [];

  return (
    <Sheet open={row !== null} onClose={onClose} title={row ? `${row.ticketNo}` : "Complaint"} description={row?.subject} className="sm:max-w-xl">
      {detail.isPending ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : detail.isError ? (
        <ErrorState error={detail.error} onRetry={() => void detail.refetch()} />
      ) : (
        <div className="space-y-6">
          <section aria-label="Details" className="space-y-2 rounded-xl border border-border bg-surface-2/50 p-4 text-sm">
            <p className="flex items-center gap-2 text-fg-muted">
              {detail.data.isAnonymous ? (
                <>
                  <EyeOff className="size-4" aria-hidden /> Anonymous complainant
                </>
              ) : (
                <>
                  {detail.data.user?.name} · {detail.data.user?.studentId ?? detail.data.user?.email}
                </>
              )}
              <span className="ml-auto text-xs">{formatDateTime(detail.data.createdAt)}</span>
            </p>
            <p className="whitespace-pre-line">{detail.data.description}</p>
          </section>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Status">
              <Select value={detail.data.status} disabled={busy} onChange={(event) => void send({ status: event.target.value }, { loading: "Updating status…", success: "Status updated. The student was notified." })}>
                {optionsOf(COMPLAINT_STATUS).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={detail.data.priority} disabled={busy} onChange={(event) => void send({ priority: event.target.value }, { loading: "Updating priority…", success: "Priority updated." })}>
                {optionsOf(COMPLAINT_PRIORITY).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-fg-muted">Assigned to:</span>
            <strong>{detail.data.assignedTo?.name ?? "Nobody"}</strong>
            {detail.data.assignedTo?.id !== user?.id && (
              <Button size="sm" variant="soft" disabled={busy} onClick={() => void send({ assignedToId: user?.id }, { loading: "Assigning…", success: "Assigned to you." })}>
                <UserCheck /> Take it
              </Button>
            )}
            {detail.data.assignedTo && (
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => void send({ assignedToId: null }, { loading: "Unassigning…", success: "Unassigned." })}>
                <UserX /> Unassign
              </Button>
            )}
          </div>

          <form
            className="space-y-3 rounded-xl border border-border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void send({ note, isInternal: internal }, { loading: internal ? "Saving note…" : "Sending reply…", success: internal ? "Internal note saved." : "Reply sent to the student by notification and email." }).then((sent) => sent && setNote(""));
            }}
          >
            <Field label={internal ? "Internal note (staff only)" : "Reply to the student"}>
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} maxLength={2000} />
            </Field>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Switch checked={internal} onCheckedChange={setInternal} label="Internal only" />
              <Button type="submit" loading={busy} disabled={note.trim().length < 3}>
                <MessageSquare /> {internal ? "Save note" : "Send reply"}
              </Button>
            </div>
          </form>

          <section aria-label="Timeline">
            <h3 className="mb-3 font-display text-base font-semibold">Timeline</h3>
            {timeline.length === 0 ? <p className="text-sm text-fg-subtle">No updates yet.</p> : <Timeline items={timeline} />}
          </section>
        </div>
      )}
    </Sheet>
  );
}

export function ComplaintsAdmin() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [assignee, setAssignee] = useState("");
  const [open, setOpen] = useState<ComplaintRow | null>(null);
  const complaints = useAdminCollection<ComplaintRow>("complaints", "/api/admin/complaints", { q, status, priority, category, assignee });

  const columns: Array<Column<ComplaintRow>> = [
    {
      key: "ticket",
      header: "Ticket",
      cell: (row) => (
        <div className="min-w-0">
          <p className="font-mono text-xs font-semibold text-primary">{row.ticketNo}</p>
          <p className="max-w-xs truncate font-semibold">{row.subject}</p>
        </div>
      ),
      sortValue: (row) => row.ticketNo,
    },
    { key: "category", header: "Category", cell: (row) => <Badge tone={labelOf(COMPLAINT_CATEGORY, row.category).tone}>{labelOf(COMPLAINT_CATEGORY, row.category).label}</Badge> },
    { key: "priority", header: "Priority", cell: (row) => <Badge tone={labelOf(COMPLAINT_PRIORITY, row.priority).tone}>{labelOf(COMPLAINT_PRIORITY, row.priority).label}</Badge>, sortValue: (row) => ["LOW", "MEDIUM", "HIGH", "URGENT"].indexOf(row.priority) },
    { key: "status", header: "Status", cell: (row) => <Badge tone={labelOf(COMPLAINT_STATUS, row.status).tone}>{labelOf(COMPLAINT_STATUS, row.status).label}</Badge>, sortValue: (row) => row.status },
    { key: "assignee", header: "Assignee", cell: (row) => row.assignedTo?.name ?? <span className="text-fg-subtle">Unassigned</span> },
    { key: "created", header: "Filed", cell: (row) => formatRelative(row.createdAt), sortValue: (row) => row.createdAt },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <Button size="sm" variant="soft" onClick={() => setOpen(row)}>
          Open
        </Button>
      ),
    },
  ];

  return (
    <AdminPage title="Complaints" description="Triage, assign and resolve student complaints. Replies reach the student; internal notes never do.">
      <AdminList
        list={complaints}
        columns={columns}
        caption="Complaints"
        emptyTitle="No complaints match"
        emptyDescription="Adjust the filters, or enjoy the quiet."
        toolbar={
          <Toolbar>
            <SearchBar value={q} onSearch={setQ} placeholder="Ticket or subject…" label="Search complaints" />
            <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {optionsOf(COMPLAINT_STATUS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter by priority" value={priority} onChange={(event) => setPriority(event.target.value)}>
              <option value="">All priorities</option>
              {optionsOf(COMPLAINT_PRIORITY).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter by category" value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="">All categories</option>
              {optionsOf(COMPLAINT_CATEGORY).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter by assignee" value={assignee} onChange={(event) => setAssignee(event.target.value)}>
              <option value="">Anyone</option>
              <option value="me">Assigned to me</option>
              <option value="unassigned">Unassigned</option>
            </Select>
          </Toolbar>
        }
      />
      <ComplaintSheet key={open?.id ?? "none"} row={open} onClose={() => setOpen(null)} />
    </AdminPage>
  );
}
