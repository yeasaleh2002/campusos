"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { AdminList, AdminPage, Toolbar } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import type { Column } from "@/components/ui/data-table";
import { Input, Select } from "@/components/ui/input";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { useDebounce } from "@/hooks/use-debounce";
import { formatDateTime } from "@/lib/format";

interface AuditRow {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
  actor: { id: string; name: string; role: string } | null;
}

const ENTITY_TYPES = ["Event", "EventRegistration", "Club", "Resource", "Notice", "FormLink", "KnowledgeEntry", "BusRoute", "BusTrip", "LostFoundItem", "Complaint", "User", "SiteSetting", "ChatMessage"];

function metaSummary(metadata: AuditRow["metadata"]): string {
  if (!metadata) return "";
  return Object.entries(metadata)
    .filter(([, value]) => value !== null && value !== undefined && value !== "")
    .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
    .join(" · ");
}

export function AuditAdmin() {
  const params = useSearchParams();
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const debouncedAction = useDebounce(action.trim().toLowerCase(), 350);
  const actorId = params.get("actorId") ?? "";
  const logs = useAdminCollection<AuditRow>("audit", "/api/admin/audit-logs", { action: /^[a-z_.]+$/.test(debouncedAction) ? debouncedAction : "", entityType, actorId }, 30);

  const columns: Array<Column<AuditRow>> = [
    { key: "when", header: "When", cell: (row) => <time dateTime={row.createdAt} className="whitespace-nowrap text-sm">{formatDateTime(row.createdAt)}</time>, sortValue: (row) => row.createdAt },
    { key: "actor", header: "Who", cell: (row) => (row.actor ? <span className="text-sm"><span className="font-semibold">{row.actor.name}</span> <span className="text-xs text-fg-subtle">{row.actor.role.replace("_", " ").toLowerCase()}</span></span> : <span className="text-fg-subtle">System</span>) },
    { key: "action", header: "Action", cell: (row) => <code className="rounded-md bg-surface-2 px-1.5 py-0.5 text-xs">{row.action}</code> },
    { key: "entity", header: "Target", cell: (row) => <Badge>{row.entityType}</Badge> },
    { key: "details", header: "Details", hideOnMobile: false, cell: (row) => <p className="max-w-md truncate text-xs text-fg-muted" title={metaSummary(row.metadata)}>{metaSummary(row.metadata) || "-"}</p> },
    { key: "ip", header: "IP", cell: (row) => <span className="font-mono text-xs text-fg-subtle">{row.ip ?? "-"}</span> },
  ];

  return (
    <AdminPage title="Audit log" description={actorId ? "Showing actions by one account." : "Every admin action, newest first. Entries cannot be edited."}>
      <AdminList
        list={logs}
        columns={columns}
        caption="Audit log"
        emptyTitle="No matching entries"
        toolbar={
          <Toolbar>
            <div className="w-full max-w-xs">
              <Input aria-label="Filter by action" placeholder="Action, e.g. event.publish" value={action} onChange={(event) => setAction(event.target.value)} />
            </div>
            <Select aria-label="Filter by target type" value={entityType} onChange={(event) => setEntityType(event.target.value)}>
              <option value="">All targets</option>
              {ENTITY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
          </Toolbar>
        }
      />
    </AdminPage>
  );
}
