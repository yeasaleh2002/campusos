"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, EyeOff, HandHelping, RotateCcw, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { AdminList, AdminPage, ReasonDialog, Toolbar } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { Sheet } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";
import { CLAIM_STATUS, labelOf, LOST_FOUND_CATEGORY, LOST_FOUND_STATUS, LOST_FOUND_TYPE } from "@/lib/labels";
import { toastPromise } from "@/lib/toast";

type Action = "HIDE" | "RESTORE" | "RESOLVE" | "REMOVE";

interface ItemRow {
  id: string;
  type: "LOST" | "FOUND";
  title: string;
  category: string;
  locationText: string;
  status: "OPEN" | "CLAIMED" | "RESOLVED" | "REJECTED";
  imageUrls: string[];
  createdAt: string;
  _count: { claims: number };
  reporter: { name: string; email: string; studentId: string | null };
}

interface Claim {
  id: string;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  claimer: { name: string; studentId: string | null };
}

function ClaimsSheet({ item, onClose }: { item: ItemRow | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const claims = useQuery({ queryKey: ["admin", "claims", item?.id], enabled: item !== null, queryFn: () => api.get<Claim[]>(`/api/lost-found/${item?.id}/claims`) });

  const decide = (claim: Claim, decision: "APPROVE" | "REJECT") =>
    toastPromise(api.patch(`/api/lost-found/${item?.id}/claims/${claim.id}`, { decision }), {
      loading: decision === "APPROVE" ? "Approving claim…" : "Rejecting claim…",
      success: decision === "APPROVE" ? `Claim by ${claim.claimer.name} approved. Public site updated ✓` : "Claim rejected.",
    })
      .then(() => Promise.all([queryClient.invalidateQueries({ queryKey: ["admin", "claims", item?.id] }), queryClient.invalidateQueries({ queryKey: ["admin", "lost-found"] })]))
      .catch(() => undefined);

  return (
    <Sheet open={item !== null} onClose={onClose} title="Claims" description={item?.title}>
      {claims.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : claims.isError ? (
        <ErrorState error={claims.error} onRetry={() => void claims.refetch()} />
      ) : claims.data.length === 0 ? (
        <EmptyState title="No claims" description="Nobody has claimed this item yet." />
      ) : (
        <ul className="space-y-3">
          {claims.data.map((claim) => (
            <li key={claim.id} className="rounded-xl border border-border bg-surface-2/50 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">
                  {claim.claimer.name} {claim.claimer.studentId && <span className="text-xs font-normal text-fg-subtle">({claim.claimer.studentId})</span>}
                </p>
                <Badge tone={labelOf(CLAIM_STATUS, claim.status).tone}>{labelOf(CLAIM_STATUS, claim.status).label}</Badge>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-fg-muted">{claim.message}</p>
              <p className="mt-1 text-xs text-fg-subtle">{formatRelative(claim.createdAt)}</p>
              {claim.status === "PENDING" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" disabled={item?.status !== "OPEN"} onClick={() => void decide(claim, "APPROVE")}>
                    Approve
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => void decide(claim, "REJECT")}>
                    Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

export function LostFoundAdmin() {
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [q, setQ] = useState("");
  const [reasonFor, setReasonFor] = useState<{ item: ItemRow; action: "HIDE" | "REMOVE" } | null>(null);
  const [claimsFor, setClaimsFor] = useState<ItemRow | null>(null);
  const items = useAdminCollection<ItemRow>("lost-found", "/api/admin/lost-found", { status, type, q });

  const moderate = (item: ItemRow, action: Action, reason?: string) => {
    const nextStatus = { HIDE: "REJECTED", RESTORE: "OPEN", RESOLVE: "RESOLVED", REMOVE: item.status } as const;
    const verb = { HIDE: "hidden", RESTORE: "restored", RESOLVE: "marked resolved", REMOVE: "removed" }[action];
    return items.mutate(
      { request: () => api.patch(`/api/admin/lost-found/${item.id}`, { action, reason }), loading: "Updating…", success: `“${item.title}” ${verb}.`, publicSite: true },
      action === "REMOVE" ? items.removeItem(item.id) : items.patchItem(item.id, { status: nextStatus[action] }),
    );
  };

  const columns: Array<Column<ItemRow>> = [
    {
      key: "title",
      header: "Post",
      sortValue: (row) => row.title.toLowerCase(),
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          {row.imageUrls[0] ? <Image src={row.imageUrls[0]} alt="" width={44} height={44} className="size-11 shrink-0 rounded-lg object-cover" /> : <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-surface-2 text-xs text-fg-subtle">No photo</span>}
          <div className="min-w-0">
            <p className="max-w-xs truncate font-semibold">{row.title}</p>
            <p className="max-w-xs truncate text-xs text-fg-subtle">
              {labelOf(LOST_FOUND_CATEGORY, row.category).label} · {row.locationText}
            </p>
          </div>
        </div>
      ),
    },
    { key: "type", header: "Type", cell: (row) => <Badge tone={labelOf(LOST_FOUND_TYPE, row.type).tone}>{labelOf(LOST_FOUND_TYPE, row.type).label}</Badge> },
    { key: "reporter", header: "Reporter", cell: (row) => <span className="text-sm">{row.reporter.name}</span> },
    { key: "status", header: "Status", cell: (row) => <Badge tone={labelOf(LOST_FOUND_STATUS, row.status).tone}>{labelOf(LOST_FOUND_STATUS, row.status).label}</Badge>, sortValue: (row) => row.status },
    { key: "posted", header: "Posted", cell: (row) => formatRelative(row.createdAt), sortValue: (row) => row.createdAt },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex flex-nowrap justify-end gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={`Claims on ${row.title} (${row._count.claims})`} title={`Claims (${row._count.claims})`} onClick={() => setClaimsFor(row)}>
            <HandHelping />
          </Button>
          {row.status === "REJECTED" ? (
            <Button size="icon-sm" variant="ghost" aria-label={`Restore ${row.title}`} title="Restore" onClick={() => void moderate(row, "RESTORE").catch(() => undefined)}>
              <RotateCcw />
            </Button>
          ) : (
            <Button size="icon-sm" variant="ghost" aria-label={`Hide ${row.title}`} title="Hide" onClick={() => setReasonFor({ item: row, action: "HIDE" })}>
              <EyeOff />
            </Button>
          )}
          {row.status !== "RESOLVED" && (
            <Button size="icon-sm" variant="ghost" aria-label={`Mark ${row.title} resolved`} title="Mark resolved" onClick={() => void moderate(row, "RESOLVE").catch(() => undefined)}>
              <CheckCircle2 />
            </Button>
          )}
          <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Remove ${row.title}`} title="Remove" onClick={() => setReasonFor({ item: row, action: "REMOVE" })}>
            <Trash2 />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPage title="Lost & found" description="Keep the board safe: hide abusive posts, resolve returned items and decide claims.">
      <AdminList
        list={items}
        columns={columns}
        caption="Lost and found posts"
        emptyTitle="No posts match"
        toolbar={
          <Toolbar>
            <SearchBar value={q} onSearch={setQ} placeholder="Search posts…" label="Search posts" />
            <Select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="CLAIMED">Claim pending</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Hidden</option>
            </Select>
            <Select aria-label="Filter by type" value={type} onChange={(event) => setType(event.target.value)}>
              <option value="">Lost and found</option>
              <option value="LOST">Lost</option>
              <option value="FOUND">Found</option>
            </Select>
          </Toolbar>
        }
      />
      <ReasonDialog
        open={reasonFor !== null}
        onClose={() => setReasonFor(null)}
        title={reasonFor?.action === "REMOVE" ? "Remove this post?" : "Hide this post?"}
        description={reasonFor?.action === "REMOVE" ? "It is deleted from the public site. The reporter is told why." : "It disappears from the public board until restored. The reporter is told why."}
        confirmLabel={reasonFor?.action === "REMOVE" ? "Remove post" : "Hide post"}
        onConfirm={async (reason) => {
          if (reasonFor) await moderate(reasonFor.item, reasonFor.action, reason);
        }}
      />
      <ClaimsSheet item={claimsFor} onClose={() => setClaimsFor(null)} />
    </AdminPage>
  );
}
