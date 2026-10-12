import { type ReactElement, type ReactNode, cloneElement, isValidElement, useId } from "react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: ReactNode;
  /** The control; receives id, aria-invalid and aria-describedby automatically. */
  children: ReactElement<Record<string, unknown>>;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  /** Visually hide the label (still read by screen readers). */
  srOnlyLabel?: boolean;
}

/** Label + control + hint/error with correct a11y wiring. */
export function Field({ label, children, hint, error, required, className, srOnlyLabel }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children, { id, "aria-invalid": error ? true : undefined, "aria-describedby": describedBy, "aria-required": required || undefined })
    : children;

  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className={cn("block text-sm font-semibold text-fg", srOnlyLabel && "sr-only")}>
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
      </label>
      {control}
      {hint && !error && <p id={hintId} className="text-xs text-fg-subtle">{hint}</p>}
      {error && (
        <p id={errorId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
