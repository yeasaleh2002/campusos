"use client";

import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "@/lib/utils";

interface CheckboxProps extends Omit<ComponentProps<"input">, "type"> {
  label: ReactNode;
  description?: ReactNode;
}

export function Checkbox({ label, description, className, id, ...props }: CheckboxProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className={cn("flex cursor-pointer items-start gap-3 select-none", className)}>
      <span className="relative mt-0.5 flex size-5 shrink-0">
        <input
          id={inputId}
          type="checkbox"
          className="peer size-5 cursor-pointer appearance-none rounded-md border border-border-strong bg-surface transition checked:border-primary checked:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          {...props}
        />
        <svg className="pointer-events-none absolute inset-0 size-5 scale-0 p-1 text-primary-fg transition peer-checked:scale-100" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-sm">
        <span className="font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-fg-subtle">{description}</span>}
      </span>
    </label>
  );
}

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onCheckedChange, label, description, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <span className="text-sm">
        <span id={`${id}-label`} className="font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-fg-subtle">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50",
          checked ? "bg-primary" : "bg-surface-3",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-5.5" : "translate-x-0.5")} />
      </button>
    </div>
  );
}
