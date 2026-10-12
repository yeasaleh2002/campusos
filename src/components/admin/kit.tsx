"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { type Column, DataTable } from "@/components/ui/data-table";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { cn } from "@/lib/utils";

/** Page frame: single h1, optional description and primary actions. */
export function AdminPage({ title, description, actions, children, className }: { title: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[100rem] space-y-6 p-4 sm:p-6 lg:p-8", className)}>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/** Card surface used for panels and forms. */
export function Panel({ title, description, actions, children, className }: { title?: string; description?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border border-border bg-surface p-5 shadow-xs sm:p-6", className)}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-base font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-fg-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

interface ListState {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => unknown;
  hasNextPage: boolean;
  fetchNextPage: () => unknown;
  isFetchingNextPage: boolean;
}

interface AdminListProps<T> {
  list: ListState & { items: T[] };
  columns: Array<Column<T>>;
  caption: string;
  toolbar?: ReactNode;
  emptyTitle: string;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
}

/** DataTable wired to a cursor list: loading skeleton, error + retry, empty state, "Load more". */
export function AdminList<T extends { id: string }>({ list, columns, caption, toolbar, emptyTitle, emptyDescription, emptyAction }: AdminListProps<T>) {
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  return (
    <div className="space-y-4">
      {toolbar}
      {list.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <DataTable
            rows={list.items}
            columns={columns}
            getKey={(row) => row.id}
            caption={caption}
            empty={<EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />}
          />
          {list.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="secondary" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** Row of compact toolbar controls (search + selects). */
export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3 [&_[role=search]]:max-w-sm [&_select]:w-auto">{children}</div>;
}

interface ReasonDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  label?: string;
  destructive?: boolean;
  /** Called with the trimmed reason; the dialog closes when it resolves and stays open when it throws. */
  onConfirm: (reason: string) => Promise<unknown>;
}

/** Destructive/negative action that must carry a reason (cancel event, reject resource, hide post...). */
export function ReasonDialog({ open, onClose, title, description, confirmLabel, label = "Reason", destructive = true, onConfirm }: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const valid = reason.trim().length >= 3;

  const submit = async () => {
    setBusy(true);
    try {
      await onConfirm(reason.trim());
      setReason("");
      onClose();
    } catch {
      // The mutation already showed a toast; keep the dialog open for a retry.
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !busy && onClose()}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Keep as is
          </Button>
          <Button variant={destructive ? "danger" : "primary"} onClick={() => void submit()} disabled={!valid} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Field label={label} required hint="At least 3 characters. The person affected sees this.">
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} maxLength={500} data-autofocus />
      </Field>
    </Dialog>
  );
}
