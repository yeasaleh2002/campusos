import { cn } from "@/lib/utils";

/** Accessible progress bar (value 0-100). */
export function Progress({ value, label, className, tone = "primary" }: { value: number; label: string; className?: string; tone?: "primary" | "accent" | "warning" | "danger" }) {
  const clamped = Math.max(0, Math.min(100, value));
  const fill = { primary: "bg-primary", accent: "bg-accent", warning: "bg-warning", danger: "bg-danger" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(clamped)} className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div className={cn("h-full rounded-full transition-[width] duration-700 ease-out", fill)} style={{ width: `${clamped}%` }} />
    </div>
  );
}
