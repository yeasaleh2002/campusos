"use client";

import { m } from "framer-motion";
import { type KeyboardEvent, type ReactNode, useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  items: Array<TabItem<T>>;
  value: T;
  onValueChange: (value: T) => void;
  label: string;
  className?: string;
  /** "pill" = sliding background, "underline" = sliding bar. */
  variant?: "pill" | "underline";
}

/**
 * Accessible tablist with a shared-layout animated indicator (layoutId) and
 * roving focus (←/→/Home/End).
 */
export function Tabs<T extends string>({ items, value, onValueChange, label, className, variant = "pill" }: TabsProps<T>) {
  const id = useId();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const onKeyDown = (event: KeyboardEvent, index: number) => {
    const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 };
    if (!(event.key in moves)) return;
    event.preventDefault();
    const next = (moves[event.key] + items.length) % items.length;
    refs.current[next]?.focus();
    onValueChange(items[next].value);
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn(
        "no-scrollbar relative flex max-w-full gap-1 overflow-x-auto",
        variant === "pill" ? "rounded-xl border border-border bg-surface-2 p-1" : "border-b border-border",
        className,
      )}
    >
      {items.map((item, index) => {
        const selected = item.value === value;
        return (
          <button
            key={item.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            role="tab"
            type="button"
            aria-selected={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onValueChange(item.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={cn(
              "relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap px-4 text-sm font-semibold transition-colors",
              variant === "pill" ? "h-9 rounded-lg" : "h-11",
              selected ? "text-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {selected && (
              <m.span
                layoutId={`${id}-indicator`}
                className={cn("absolute", variant === "pill" ? "inset-0 rounded-lg bg-surface shadow-sm" : "inset-x-2 -bottom-px h-0.5 rounded-full bg-primary")}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
            {item.count !== undefined && (
              <span className={cn("relative z-10 rounded-full px-1.5 text-[11px] font-bold", selected ? "bg-primary-soft text-primary-soft-fg" : "bg-surface-3 text-fg-subtle")}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
