"use client";

import { Trash2, UserPlus } from "lucide-react";
import { useState } from "react";
import { isAdminRole } from "@/components/admin/admin-nav";
import type { ClubRow } from "@/components/admin/clubs/clubs-admin";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Sheet } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api, errorMessage } from "@/lib/api-client";
import { toast } from "@/lib/toast";

interface MemberRow {
  id: string;
  role: "MEMBER" | "EXECUTIVE" | "ADMIN";
  user: { id: string; name: string; email: string };
}

const ROLE_LABEL = { MEMBER: "Member", EXECUTIVE: "Executive", ADMIN: "Club admin" } as const;

function MembersBody({ club }: { club: ClubRow }) {
  const { user } = useAuth();
  const canAssignAdmin = isAdminRole(user?.role);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRow["role"]>("MEMBER");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<MemberRow | null>(null);
  const members = useAdminCollection<MemberRow>(`club-members-${club.id}`, `/api/admin/clubs/${club.id}/members`, undefined, 50);

  const add = async () => {
    setAdding(true);
    try {
      await members.mutate({ request: () => api.post(`/api/admin/clubs/${club.id}/members`, { email, role }), loading: "Adding…", success: "Member saved.", publicSite: true });
      setEmail("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setAdding(false);
    }
  };

  const changeRole = (row: MemberRow, next: MemberRow["role"]) =>
    members.mutate({ request: () => api.patch(`/api/admin/clubs/${club.id}/members/${row.user.id}`, { role: next }), loading: "Updating role…", success: `${row.user.name} is now ${ROLE_LABEL[next].toLowerCase()}.` }, members.patchItem(row.id, { role: next })).catch(() => undefined);

  const remove = (row: MemberRow) =>
    members.mutate({ request: () => api.delete(`/api/admin/clubs/${club.id}/members/${row.user.id}`), loading: "Removing…", success: `${row.user.name} removed.`, publicSite: true }, members.removeItem(row.id)).catch(() => undefined);

  return (
    <div className="space-y-5">
      <form
        className="space-y-3 rounded-xl border border-border bg-surface-2/50 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void add();
        }}
      >
        <Field label="Add by email" hint="They need an active CampusOS account.">
          <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="student@example.com" autoComplete="off" />
        </Field>
        <div className="flex items-end gap-3">
          <Field label="Role" className="flex-1">
            <Select value={role} onChange={(event) => setRole(event.target.value as MemberRow["role"])}>
              <option value="MEMBER">Member</option>
              <option value="EXECUTIVE">Executive</option>
              {canAssignAdmin && <option value="ADMIN">Club admin</option>}
            </Select>
          </Field>
          <Button type="submit" loading={adding} disabled={!email.includes("@")}>
            <UserPlus /> Add
          </Button>
        </div>
      </form>

      {members.isPending ? (
        <Skeleton className="h-40 rounded-xl" />
      ) : members.isError ? (
        <ErrorState error={members.error} onRetry={() => void members.refetch()} />
      ) : members.items.length === 0 ? (
        <EmptyState title="No members yet" description="Add the first member above." />
      ) : (
        <ul className="divide-y divide-border">
          {members.items.map((row) => (
            <li key={row.id} className="flex items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{row.user.name}</span>
                <span className="block truncate text-xs text-fg-subtle">{row.user.email}</span>
              </span>
              {row.role === "ADMIN" && !canAssignAdmin ? (
                <Badge tone="primary">Club admin</Badge>
              ) : (
                <Select aria-label={`Role of ${row.user.name}`} value={row.role} onChange={(event) => void changeRole(row, event.target.value as MemberRow["role"])} className="w-36">
                  <option value="MEMBER">Member</option>
                  <option value="EXECUTIVE">Executive</option>
                  {canAssignAdmin && <option value="ADMIN">Club admin</option>}
                </Select>
              )}
              {(canAssignAdmin || row.role !== "ADMIN") && (
                <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Remove ${row.user.name}`} onClick={() => setRemoving(row)}>
                  <Trash2 />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {members.hasNextPage && (
        <Button variant="secondary" loading={members.isFetchingNextPage} onClick={() => void members.fetchNextPage()}>
          Load more
        </Button>
      )}
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove this member?"
        description={`${removing?.user.name ?? "They"} will lose their place in ${club.name}${removing?.role === "ADMIN" ? " and their club admin access" : ""}.`}
        confirmLabel="Remove"
        destructive
        onConfirm={() => {
          const target = removing;
          setRemoving(null);
          if (target) void remove(target);
        }}
      />
    </div>
  );
}

export function ClubMembersSheet({ club, onClose }: { club: ClubRow | null; onClose: () => void }) {
  return (
    <Sheet open={club !== null} onClose={onClose} title={club ? `${club.name}: members` : "Members"} description="Club admins can manage this club's events, registrations and check-in.">
      {club && <MembersBody key={club.id} club={club} />}
    </Sheet>
  );
}
