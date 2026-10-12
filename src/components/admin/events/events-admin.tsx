"use client";

import { CalendarX2, Eye, Pencil, Plus, ScanLine, Send, Trash2, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useClubOptions } from "@/components/admin/admin-hooks";
import { AdminList, AdminPage, ReasonDialog, Toolbar } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api } from "@/lib/api-client";
import { formatDateTime } from "@/lib/format";
import { EVENT_STATUS, EVENT_TYPE, labelOf, optionsOf } from "@/lib/labels";

export interface AdminEventRow {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: "DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED";
  startAt: string;
  endAt: string;
  venue: string;
  capacity: number | null;
  registrationCount: number;
  club: { name: string } | null;
}

export function EventsAdmin() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [clubId, setClubId] = useState("");
  const [cancelTarget, setCancelTarget] = useState<AdminEventRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminEventRow | null>(null);
  const clubs = useClubOptions();
  const events = useAdminCollection<AdminEventRow>("events", "/api/admin/events", { q, status, clubId });

  const publish = (row: AdminEventRow) =>
    events.mutate(
      { request: () => api.post(`/api/admin/events/${row.id}/publish`, {}), loading: "Publishing…", success: `“${row.title}” is live.`, publicSite: true },
      events.patchItem(row.id, { status: "PUBLISHED" }),
    );

  const cancel = (row: AdminEventRow, reason: string) =>
    events.mutate(
      { request: () => api.post(`/api/admin/events/${row.id}/cancel`, { reason }), loading: "Cancelling and notifying attendees…", success: `Cancelled. ${row.registrationCount} registrant(s) are being notified.`, publicSite: true },
      events.patchItem(row.id, { status: "CANCELLED" }),
    );

  const remove = (row: AdminEventRow) =>
    events.mutate({ request: () => api.delete(`/api/admin/events/${row.id}`), loading: "Deleting…", success: "Event deleted.", publicSite: true }, events.removeItem(row.id));

  const columns: Array<Column<AdminEventRow>> = [
    {
      key: "title",
      header: "Event",
      sortValue: (row) => row.title.toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="max-w-xs truncate font-semibold">{row.title}</p>
          <p className="text-xs text-fg-subtle">{labelOf(EVENT_TYPE, row.type).label} · {row.venue}</p>
        </div>
      ),
    },
    { key: "club", header: "Club", cell: (row) => row.club?.name ?? "-", sortValue: (row) => row.club?.name ?? "" },
    { key: "start", header: "Starts", cell: (row) => formatDateTime(row.startAt), sortValue: (row) => row.startAt },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const meta = labelOf(EVENT_STATUS, row.status);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
      sortValue: (row) => row.status,
    },
    {
      key: "regs",
      header: "Registered",
      cell: (row) => (
        <span className="tabular-nums">
          {row.registrationCount}
          {row.capacity ? ` / ${row.capacity}` : ""}
        </span>
      ),
      sortValue: (row) => row.registrationCount,
    },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex flex-nowrap items-center justify-end gap-1">
          {row.status === "DRAFT" && (
            <Button size="icon-sm" variant="soft" aria-label={`Publish ${row.title}`} title="Publish" onClick={() => void publish(row).catch(() => undefined)}>
              <Send />
            </Button>
          )}
          {row.status === "PUBLISHED" && (
            <Button asChild size="icon-sm" variant="ghost">
              <Link href={`/admin/events/${row.id}/checkin`} aria-label={`Check-in for ${row.title}`} title="Live check-in">
                <ScanLine />
              </Link>
            </Button>
          )}
          <Button asChild size="icon-sm" variant="ghost">
            <Link href={`/admin/events/${row.id}/registrations`} aria-label={`Registrations for ${row.title}`} title="Registrations">
              <Users />
            </Link>
          </Button>
          {row.status !== "CANCELLED" && row.status !== "COMPLETED" && (
            <Button asChild size="icon-sm" variant="ghost">
              <Link href={`/admin/events/${row.id}/edit`} aria-label={`Edit ${row.title}`} title="Edit">
                <Pencil />
              </Link>
            </Button>
          )}
          {row.status === "PUBLISHED" && (
            <Button asChild size="icon-sm" variant="ghost">
              <Link href={`/events/${row.slug}`} target="_blank" rel="noopener" aria-label={`View ${row.title} on the public site`} title="View public page">
                <Eye />
              </Link>
            </Button>
          )}
          {(row.status === "DRAFT" || row.status === "PUBLISHED") && (
            <Button size="icon-sm" variant="ghost" aria-label={`Cancel ${row.title}`} title="Cancel event" onClick={() => setCancelTarget(row)}>
              <CalendarX2 />
            </Button>
          )}
          <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Delete ${row.title}`} title="Delete" onClick={() => setDeleteTarget(row)}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage
      title="Events"
      description="Create, publish and run campus events. Changes appear on the public site immediately."
      actions={
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus /> New event
          </Link>
        </Button>
      }
    >
      <AdminList
        list={events}
        columns={columns}
        caption="Events"
        emptyTitle="No events found"
        emptyDescription="Try a different filter, or create the first event."
        toolbar={
          <Toolbar>
            <SearchBar value={q} onSearch={setQ} placeholder="Search events…" label="Search events" />
            <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              {optionsOf(EVENT_STATUS).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter by club" value={clubId} onChange={(event) => setClubId(event.target.value)}>
              <option value="">All clubs</option>
              {clubs.data?.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </Select>
          </Toolbar>
        }
      />
      <ReasonDialog
        open={cancelTarget !== null}
        onClose={() => setCancelTarget(null)}
        title={`Cancel “${cancelTarget?.title ?? ""}”?`}
        description="Registered students are notified in the app and by email with this reason. This cannot be undone."
        confirmLabel="Cancel event"
        label="Reason for cancelling"
        onConfirm={(reason) => (cancelTarget ? cancel(cancelTarget, reason) : Promise.resolve())}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this event?"
        description={`“${deleteTarget?.title ?? ""}” will be removed from the site. Events with registrations must be cancelled first.`}
        confirmLabel="Delete event"
        destructive
        onConfirm={() => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (target) void remove(target).catch(() => undefined);
        }}
      />
    </AdminPage>
  );
}
