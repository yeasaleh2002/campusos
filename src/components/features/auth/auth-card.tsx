import type { ReactNode } from "react";

/** Heading block + form body + footer link for every auth page (one h1 per page). */
export function AuthCard({ title, description, icon, children, footer }: { title: string; description: ReactNode; icon?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div>
      {icon && <div className="mb-6 grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary-soft-fg [&_svg]:size-7">{icon}</div>}
      <h1 className="font-display text-h2 font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-fg-muted">{description}</p>
      <div className="mt-8">{children}</div>
      {footer && <div className="mt-8 text-center text-sm text-fg-muted">{footer}</div>}
    </div>
  );
}

export function AuthCardSkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-9 w-2/3 rounded-lg bg-surface-2" />
      <div className="h-5 w-full rounded-lg bg-surface-2" />
      <div className="mt-8 h-11 rounded-xl bg-surface-2" />
      <div className="h-11 rounded-xl bg-surface-2" />
      <div className="h-12 rounded-xl bg-surface-2" />
    </div>
  );
}
