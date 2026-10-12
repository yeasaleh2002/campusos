import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  eyebrow?: ReactNode;
  /** "hero" adds the mesh backdrop used on public section landing pages. */
  variant?: "hero" | "plain";
  className?: string;
}

/** The single <h1> of a page: breadcrumbs, title, description and primary actions. */
export function PageHeader({ title, description, breadcrumbs, actions, eyebrow, variant = "plain", className }: PageHeaderProps) {
  return (
    <header className={cn("relative", variant === "hero" && "isolate overflow-hidden border-b border-border bg-surface-2/40 py-10 sm:py-14", className)}>
      {variant === "hero" && (
        <>
          <div aria-hidden className="bg-mesh absolute inset-0 -z-10 opacity-70" />
          <div aria-hidden className="bg-grid absolute inset-0 -z-10 opacity-[0.07]" />
        </>
      )}
      <div className={cn(variant === "hero" && "container-app")}>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <div className={cn("flex flex-wrap items-end justify-between gap-4", breadcrumbs && "mt-4")}>
          <div className="max-w-3xl">
            {eyebrow && <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>}
            <h1 className="font-display text-h1 font-bold tracking-tight">{title}</h1>
            {description && <p className="mt-3 text-lg text-fg-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>
    </header>
  );
}
