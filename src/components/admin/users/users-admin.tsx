"use client";

import { History, LogOut, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminList, AdminPage, Toolbar } from "@/components/admin/kit";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Column } from "@/components/ui/data-table";
import { Select } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api } from "@/lib/api-client";
import { formatDate, formatRelative } from "@/lib/format";

type Role = "USER" | "MODERATOR" | "CLUB_ADMIN" | "ADMIN" | "SUPER_ADMIN";

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  studentId: string | null;
  batch: string | null;
  isActive: boolean;
  isEmailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  department: { code: string } | null;
}

const ROLE_LABEL: Record<Role, string> = { USER: "Student", MODERATOR: "Moderator", CLUB_ADMIN: "Club admin", ADMIN: "Admin", SUPER_ADMIN: "Super admin" };
const ROLE_TONE = { USER: "neutral", MODERATOR: "info", CLUB_ADMIN: "accent", ADMIN: "primary", SUPER_ADMIN: "saffron" } as const;
const ELEVATED: Role[] = ["ADMIN", "SUPER_ADMIN"];

type Pending = { kind: "deactivate" | "activate" | "logout" | "role"; user: UserRow; role?: Role };

export function UsersAdmin() {
  const { user: me } = useAuth();
  const isSuper = me?.role === "SUPER_ADMIN";
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const users = useAdminCollection<UserRow>("users", "/api/admin/users", { q, role, isActive: active });

  const run = (action: Pending) => {
    const { user, kind } = action;
    if (kind === "logout") return users.mutate({ request: () => api.post(`/api/admin/users/${user.id}/force-logout`, {}), loading: "Signing out…", success: `${user.name} was signed out everywhere.` });
    if (kind === "role" && action.role) return users.mutate({ request: () => api.patch(`/api/admin/users/${user.id}`, { role: action.role }), loading: "Changing role…", success: `${user.name} is now ${ROLE_LABEL[action.role as Role].toLowerCase()}. Their sessions were refreshed.` }, users.patchItem(user.id, { role: action.role }));
    const isActive = kind === "activate";
    return users.mutate({ request: () => api.patch(`/api/admin/users/${user.id}`, { isActive }), loading: isActive ? "Activating…" : "Deactivating…", success: isActive ? `${user.name} can sign in again.` : `${user.name} was deactivated and signed out.` }, users.patchItem(user.id, { isActive }));
  };

  /** Rows the viewer may not touch: yourself, and admins unless you are a super admin. */
  const locked = (row: UserRow) => row.id === me?.id || (ELEVATED.includes(row.role) && !isSuper);

  const columns: Array<Column<UserRow>> = [
    {
      key: "name",
      header: "User",
      sortValue: (row) => row.name.toLowerCase(),
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {row.name} {row.id === me?.id && <span className="text-xs font-normal text-fg-subtle">(you)</span>}
          </p>
          <p className="truncate text-xs text-fg-subtle">{[row.email, row.studentId, row.department?.code].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortValue: (row) => row.role,
      cell: (row) =>
        locked(row) ? (
          <Badge tone={ROLE_TONE[row.role]}>{ROLE_LABEL[row.role]}</Badge>
        ) : (
          <Select aria-label={`Role of ${row.name}`} value={row.role} onChange={(event) => setPending({ kind: "role", user: row, role: event.target.value as Role })} className="w-36">
            {(Object.keys(ROLE_LABEL) as Role[])
              .filter((value) => isSuper || !ELEVATED.includes(value))
              .map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABEL[value]}
                </option>
              ))}
          </Select>
        ),
    },
    {
      key: "state",
      header: "Status",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          <Badge tone={row.isActive ? "success" : "danger"}>{row.isActive ? "Active" : "Deactivated"}</Badge>
          {!row.isEmailVerified && <Badge tone="warning">Unverified</Badge>}
        </div>
      ),
    },
    { key: "login", header: "Last sign-in", cell: (row) => (row.lastLoginAt ? formatRelative(row.lastLoginAt) : "Never"), sortValue: (row) => row.lastLoginAt ?? "" },
    { key: "joined", header: "Joined", cell: (row) => formatDate(row.createdAt), sortValue: (row) => row.createdAt },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          {row.role !== "USER" && (
            <Button asChild size="icon-sm" variant="ghost">
              <Link href={`/admin/audit-log?actorId=${row.id}`} aria-label={`Activity of ${row.name}`} title="View activity">
                <History />
              </Link>
            </Button>
          )}
          {!locked(row) && (
            <>
              <Button size="icon-sm" variant="ghost" aria-label={`Sign ${row.name} out everywhere`} title="Force logout" onClick={() => setPending({ kind: "logout", user: row })}>
                <LogOut />
              </Button>
              {row.isActive ? (
                <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Deactivate ${row.name}`} title="Deactivate" onClick={() => setPending({ kind: "deactivate", user: row })}>
                  <UserX />
                </Button>
              ) : (
                <Button size="icon-sm" variant="ghost" aria-label={`Activate ${row.name}`} title="Activate" onClick={() => void run({ kind: "activate", user: row }).catch(() => undefined)}>
                  <UserCheck />
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ];

  const copy: Record<Pending["kind"], { title: string; confirm: string }> = {
    deactivate: { title: "Deactivate this account?", confirm: "Deactivate" },
    activate: { title: "Activate this account?", confirm: "Activate" },
    logout: { title: "Sign out everywhere?", confirm: "Force logout" },
    role: { title: "Change this role?", confirm: "Change role" },
  };

  return (
    <AdminPage title="Users" description="Search accounts, change roles and revoke access. Elevated roles can only be changed by a super admin.">
      <AdminList
        list={users}
        columns={columns}
        caption="User accounts"
        emptyTitle="No users match"
        toolbar={
          <Toolbar>
            <SearchBar value={q} onSearch={setQ} placeholder="Name, email or student ID…" label="Search users" />
            <Select aria-label="Filter by role" value={role} onChange={(event) => setRole(event.target.value)}>
              <option value="">All roles</option>
              {(Object.keys(ROLE_LABEL) as Role[]).map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABEL[value]}
                </option>
              ))}
            </Select>
            <Select aria-label="Filter by state" value={active} onChange={(event) => setActive(event.target.value)}>
              <option value="">Active and deactivated</option>
              <option value="true">Active</option>
              <option value="false">Deactivated</option>
            </Select>
          </Toolbar>
        }
      />
      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => !open && setPending(null)}
        title={pending ? copy[pending.kind].title : ""}
        description={
          pending
            ? pending.kind === "role"
              ? `${pending.user.name} becomes ${ROLE_LABEL[pending.role ?? "USER"].toLowerCase()} and is signed out so the new access applies.`
              : pending.kind === "deactivate"
                ? `${pending.user.name} is signed out immediately and cannot sign in until you activate the account again.`
                : `${pending.user.name} must sign in again on every device.`
            : ""
        }
        confirmLabel={pending ? copy[pending.kind].confirm : "Confirm"}
        destructive={pending?.kind === "deactivate" || pending?.kind === "logout"}
        onConfirm={() => {
          const target = pending;
          setPending(null);
          if (target) void run(target).catch(() => undefined);
        }}
      />
    </AdminPage>
  );
}
