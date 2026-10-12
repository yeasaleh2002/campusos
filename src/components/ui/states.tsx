"use client";

import { AlertTriangle, Inbox, RefreshCw, WifiOff } from "lucide-react";
import type { ReactNode } from "react";
import { ApiClientError, errorMessage } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** Friendly empty result with an optional next step. */
export function EmptyState({ title, description, icon, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-strong bg-surface/60 px-6 py-14 text-center", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg [&_svg]:size-7">{icon ?? <Inbox />}</div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1.5 max-w-md text-sm text-fg-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Error panel; detects offline/network failures and offers a retry. */
export function ErrorState({ error, onRetry, title, className }: { error?: unknown; onRetry?: () => void; title?: string; className?: string }) {
  const offline = error instanceof ApiClientError && error.code === "NETWORK_ERROR";
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center rounded-2xl border border-danger/25 bg-danger-soft/40 px-6 py-12 text-center", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger [&_svg]:size-7">{offline ? <WifiOff /> : <AlertTriangle />}</div>
      <h3 className="font-display text-lg font-semibold">{title ?? (offline ? "You're offline" : "Something went wrong")}</h3>
      <p className="mt-1.5 max-w-md text-sm text-fg-muted">{error ? errorMessage(error) : "Please try again."}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RefreshCw /> Try again
        </Button>
      )}
    </div>
  );
}
