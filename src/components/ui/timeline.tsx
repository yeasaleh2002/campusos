import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface TimelineItem {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  meta?: ReactNode;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
  icon?: ReactNode;
}

const DOT = {
  primary: "bg-primary text-primary-fg",
  success: "bg-success text-white",
  warning: "bg-warning text-white",
  danger: "bg-danger text-white",
  neutral: "bg-surface-3 text-fg-muted",
} as const;

/** Vertical timeline (complaint updates, bus stops...). */
export function Timeline({ items, className }: { items: TimelineItem[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-6", className)}>
      {items.map((item, index) => (
        <li key={item.id} className="relative flex gap-4">
          {index < items.length - 1 && <span className="absolute left-[0.9rem] top-8 h-[calc(100%+0.5rem)] w-px bg-border" aria-hidden />}
          <span className={cn("relative z-10 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-surface [&_svg]:size-3.5", DOT[item.tone ?? "primary"])} aria-hidden>
            {item.icon ?? <span className="size-2 rounded-full bg-current" />}
          </span>
          <div className="min-w-0 flex-1 pb-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="font-semibold text-fg">{item.title}</p>
              {item.meta && <p className="text-xs text-fg-subtle">{item.meta}</p>}
            </div>
            {item.description && <div className="mt-1 text-sm leading-relaxed text-fg-muted">{item.description}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}
