import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const controlClass =
  "w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-fg shadow-xs transition-[border-color,box-shadow] placeholder:text-fg-subtle hover:border-border-strong focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/15";

export interface InputProps extends ComponentProps<"input"> {
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function Input({ className, leading, trailing, ...props }: InputProps) {
  if (!leading && !trailing) return <input className={cn(controlClass, "h-11", className)} {...props} />;
  return (
    <div className="relative">
      {leading && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-subtle [&_svg]:size-4">{leading}</span>}
      <input className={cn(controlClass, "h-11", leading && "pl-10", trailing && "pr-11", className)} {...props} />
      {trailing && <span className="absolute inset-y-0 right-2 flex items-center">{trailing}</span>}
    </div>
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClass, "min-h-28 resize-y py-3 leading-relaxed", className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(controlClass, "h-11 cursor-pointer appearance-none pr-10", className)} {...props}>
        {children}
      </select>
      <svg className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
      </svg>
    </div>
  );
}
