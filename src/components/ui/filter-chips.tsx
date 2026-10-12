"use client";

import { cn } from "@/lib/utils";

interface FilterChipsProps<T extends string> {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Single-select pill group (radiogroup semantics) for compact filters. */
export function FilterChips<T extends string>({ label, options, value, onChange, className }: FilterChipsProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1", className)}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
              selected ? "border-primary bg-primary text-primary-fg shadow-sm" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
