"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, ScanLine, UserCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminList, AdminPage, Toolbar } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api, errorMessage } from "@/lib/api-client";
import { downloadFile } from "@/lib/calendar";
import { formatDateTime } from "@/lib/format";
import { labelOf, REGISTRATION_STATUS } from "@/lib/labels";
import { toast } from "@/lib/toast";

interface AttendeeRow {
  id: string;
  status: "REGISTERED" | "CHECKED_IN" | "CANCELLED";
  createdAt: string;
  checkedInAt: string | null;
  user: { name: string; email: string; studentId: string | null; batch: string | null; department: { code: string } | null };
}

export function RegistrationsAdmin({ eventId }: { eventId: string }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [exporting, setExporting] = useState(false);
  const event = useQuery({ queryKey: ["admin", "event", eventId], queryFn: () => api.get<{ title: string; registrationCount: number; capacity: number | null }>(`/api/admin/events/${eventId}`) });
  const list = useAdminCollection<AttendeeRow>(`registrations-${eventId}`, `/api/admin/events/${eventId}/registrations`, { q, status }, 50);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/admin/events/${eventId}/registrations/export`, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Export failed. Please try again.");
      downloadFile(`registrations-${eventId}.csv`, await response.blob(), "text/csv;charset=utf-8");
      toast.success("CSV downloaded.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(false);
    }
  };

  const checkIn = (row: AttendeeRow) =>
    list.mutate(
      { request: () => api.post(`/api/admin/events/${eventId}/registrations/${row.id}/checkin`, {}), loading: "Checking in…", success: `${row.user.name} checked in.` },
      list.patchItem(row.id, { status: "CHECKED_IN", checkedInAt: new Date().toISOString() }),
    );

  const columns: Array<Column<AttendeeRow>> = [
    {
      key: "name",
      header: "Attendee",
      sortValue: (row) => row.user.name.toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.user.name}</p>
          <p className="truncate text-xs text-fg-subtle">{row.user.email}</p>
        </div>
      ),
    },
    { key: "student", header: "Student ID", cell: (row) => [row.user.studentId, row.user.department?.code].filter(Boolean).join(" · ") || "-" },
    { key: "registered", header: "Registered", cell: (row) => formatDateTime(row.createdAt), sortValue: (row) => row.createdAt },
    {
      key: "status",
      header: "Status",
      cell: (row) => {
        const meta = labelOf(REGISTRATION_STATUS, row.status);
        return (
          <div>
            <Badge tone={meta.tone}>{meta.label}</Badge>
            {row.checkedInAt && <p className="mt-0.5 text-xs text-fg-subtle">{formatDateTime(row.checkedInAt)}</p>}
          </div>
        );
      },
      sortValue: (row) => row.status,
    },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) =>
        row.status === "REGISTERED" ? (
          <Button size="sm" variant="soft" onClick={() => void checkIn(row).catch(() => undefined)}>
            <UserCheck /> Check in
          </Button>
        ) : null,
    },
  ];

  return (
    <AdminPage
      title="Registrations"
      description={event.data ? `${event.data.title} · ${event.data.registrationCount}${event.data.capacity ? ` of ${event.data.capacity}` : ""} registered` : "Loading…"}
      actions={
        <>
          <Button variant="secondary" onClick={() => void exportCsv()} loading={exporting}>
            <Download /> Export CSV
          </Button>
          <Button asChild>
            <Link href={`/admin/events/${eventId}/checkin`}>
              <ScanLine /> Live check-in
            </Link>
          </Button>
        </>
      }
    >
      <AdminList
        list={list}
        columns={columns}
        caption="Event registrations"
        emptyTitle="No registrations match"
        emptyDescription="Registrations appear here as students sign up."
        toolbar={
          <Toolbar>
            <SearchBar value={q} onSearch={setQ} placeholder="Name, email or student ID…" label="Search attendees" />
            <Select aria-label="Filter by status" value={status} onChange={(event_) => setStatus(event_.target.value)}>
              <option value="">All</option>
              <option value="REGISTERED">Registered</option>
              <option value="CHECKED_IN">Checked in</option>
              <option value="CANCELLED">Cancelled</option>
            </Select>
          </Toolbar>
        }
      />
    </AdminPage>
  );
}
