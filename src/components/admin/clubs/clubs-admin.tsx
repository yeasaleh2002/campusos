"use client";

import { Pencil, Plus, Trash2, Users } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { isAdminRole } from "@/components/admin/admin-nav";
import { ClubMembersSheet } from "@/components/admin/clubs/club-members";
import { AdminList, AdminPage, Toolbar } from "@/components/admin/kit";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { Column } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { ImageDropzone } from "@/components/ui/file-dropzone";
import { Input, Select, Textarea } from "@/components/ui/input";
import { SearchBar } from "@/components/ui/search-bar";
import { useAdminCollection } from "@/hooks/use-admin-collection";
import { api, fieldErrors } from "@/lib/api-client";
import { CLUB_CATEGORY, labelOf, optionsOf } from "@/lib/labels";

export interface ClubRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  logoUrl: string | null;
  coverUrl: string | null;
  category: string;
  isActive: boolean;
  memberCount: number;
  _count: { events: number };
}

interface ClubValues {
  name: string;
  slug: string;
  category: string;
  description: string;
}

function ClubFormDialog({ club, open, onClose, onSave }: { club: ClubRow | null; open: boolean; onClose: () => void; onSave: (payload: Record<string, unknown>, id?: string) => Promise<unknown> }) {
  const [logo, setLogo] = useState<string | null>(club?.logoUrl ?? null);
  const [active, setActive] = useState(club?.isActive ?? true);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClubValues>({ defaultValues: { name: club?.name ?? "", slug: club?.slug ?? "", category: club?.category ?? "OTHER", description: club?.description ?? "" } });

  const submit = handleSubmit(async (values) => {
    const payload: Record<string, unknown> = { name: values.name, category: values.category, description: values.description, logoUrl: logo, isActive: active };
    if (!club && values.slug) payload.slug = values.slug;
    try {
      await onSave(payload, club?.id);
      onClose();
    } catch (error) {
      for (const [path, message] of Object.entries(fieldErrors(error))) setError(path as keyof ClubValues, { message });
    }
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={club ? "Edit club" : "New club"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={isSubmitting}>
            {club ? "Save club" : "Create club"}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Name" required error={errors.name?.message}>
          <Input {...register("name", { required: "Add a club name." })} maxLength={120} />
        </Field>
        {!club && (
          <Field label="Slug" hint="Optional. Used in the public URL; generated from the name if empty." error={errors.slug?.message}>
            <Input {...register("slug")} maxLength={140} />
          </Field>
        )}
        <Field label="Category" required>
          <Select {...register("category")}>
            {optionsOf(CLUB_CATEGORY).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" required error={errors.description?.message}>
          <Textarea {...register("description", { required: "Add a description.", minLength: { value: 10, message: "Use at least 10 characters." } })} rows={4} maxLength={5000} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-semibold">Logo</p>
          {logo ? (
            <div className="flex items-center gap-3">
              <Image src={logo} alt="Club logo preview" width={64} height={64} className="size-16 rounded-xl border border-border object-cover" />
              <Button type="button" variant="secondary" size="sm" onClick={() => setLogo(null)}>
                Remove
              </Button>
            </div>
          ) : (
            <ImageDropzone purpose="club-logo" max={1} value={[]} label="Upload logo" onChange={(images) => setLogo(images[0]?.url ?? null)} />
          )}
        </div>
        <Switch checked={active} onCheckedChange={setActive} label="Active" description="Inactive clubs are hidden from the public site." />
      </form>
    </Dialog>
  );
}

export function ClubsAdmin() {
  const { user } = useAuth();
  const canManage = isAdminRole(user?.role);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<ClubRow | "new" | null>(null);
  const [membersFor, setMembersFor] = useState<ClubRow | null>(null);
  const [deleting, setDeleting] = useState<ClubRow | null>(null);
  const clubs = useAdminCollection<ClubRow>("clubs", "/api/admin/clubs", { q, includeInactive: "true" });

  const save = (payload: Record<string, unknown>, id?: string) =>
    clubs.mutate({
      request: () => (id ? api.patch(`/api/admin/clubs/${id}`, payload) : api.post("/api/admin/clubs", payload)),
      loading: id ? "Saving club…" : "Creating club…",
      success: id ? "Club saved." : "Club created.",
      publicSite: true,
    });

  const remove = (row: ClubRow) => clubs.mutate({ request: () => api.delete(`/api/admin/clubs/${row.id}`), loading: "Deleting club…", success: `${row.name} deleted.`, publicSite: true }, clubs.removeItem(row.id));

  const columns: Array<Column<ClubRow>> = [
    {
      key: "name",
      header: "Club",
      sortValue: (row) => row.name.toLowerCase(),
      cell: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          {row.logoUrl ? <Image src={row.logoUrl} alt="" width={36} height={36} className="size-9 rounded-lg object-cover" /> : <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-sm font-bold text-primary-soft-fg">{row.name[0]}</span>}
          <span className="min-w-0">
            <span className="block truncate font-semibold">{row.name}</span>
            <span className="block truncate text-xs text-fg-subtle">/{row.slug}</span>
          </span>
        </div>
      ),
    },
    { key: "category", header: "Category", cell: (row) => <Badge tone={labelOf(CLUB_CATEGORY, row.category).tone}>{labelOf(CLUB_CATEGORY, row.category).label}</Badge> },
    { key: "members", header: "Members", cell: (row) => row.memberCount, sortValue: (row) => row.memberCount },
    { key: "events", header: "Events", cell: (row) => row._count.events, sortValue: (row) => row._count.events },
    { key: "active", header: "Status", cell: (row) => <Badge tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Hidden"}</Badge> },
    {
      key: "actions",
      header: "Actions",
      className: "whitespace-nowrap text-right",
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button size="icon-sm" variant="ghost" aria-label={`Members of ${row.name}`} title="Members and admins" onClick={() => setMembersFor(row)}>
            <Users />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={`Edit ${row.name}`} title="Edit" onClick={() => setEditing(row)}>
            <Pencil />
          </Button>
          {canManage && (
            <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Delete ${row.name}`} title="Delete" onClick={() => setDeleting(row)}>
              <Trash2 />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminPage
      title="Clubs"
      description={canManage ? "Create clubs, edit their profile and assign admins." : "Your clubs. You can edit the profile and manage members."}
      actions={
        canManage && (
          <Button onClick={() => setEditing("new")}>
            <Plus /> New club
          </Button>
        )
      }
    >
      <AdminList list={clubs} columns={columns} caption="Clubs" emptyTitle="No clubs yet" toolbar={<Toolbar><SearchBar value={q} onSearch={setQ} placeholder="Search clubs…" label="Search clubs" /></Toolbar>} />
      {editing && <ClubFormDialog key={editing === "new" ? "new" : editing.id} club={editing === "new" ? null : editing} open onClose={() => setEditing(null)} onSave={save} />}
      <ClubMembersSheet club={membersFor} onClose={() => setMembersFor(null)} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this club?"
        description={`“${deleting?.name ?? ""}” and its listing disappear from the public site. Events of the club must be removed first.`}
        confirmLabel="Delete club"
        destructive
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) void remove(target).catch(() => undefined);
        }}
      />
    </AdminPage>
  );
}
