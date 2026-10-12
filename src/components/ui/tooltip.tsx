import { type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

/**
 * CSS-only tooltip (no JS): shows on hover and keyboard focus of the trigger.
 * The trigger is described by the tooltip for screen readers.
 */
export function Tooltip({ content, children, side = "top", className }: { content: ReactNode; children: ReactNode; side?: "top" | "bottom"; className?: string }) {
  const id = useId();
  return (
    <span className={cn("group/tooltip relative inline-flex", className)} aria-describedby={id}>
      {children}
      <span
        id={id}
        role="tooltip"
        className={cn(
          "pointer-events-none absolute left-1/2 z-[65] w-max max-w-56 -translate-x-1/2 rounded-lg bg-fg px-2.5 py-1.5 text-xs font-medium text-bg opacity-0 shadow-md transition duration-150",
          "group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100",
          side === "top" ? "bottom-full mb-2 translate-y-1 group-hover/tooltip:translate-y-0" : "top-full mt-2 -translate-y-1 group-hover/tooltip:translate-y-0",
        )}
      >
        {content}
      </span>
    </span>
  );
}
