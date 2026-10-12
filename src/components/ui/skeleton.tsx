import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Shimmer placeholder (transform-only animation, GPU friendly). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-surface-2", className)} aria-hidden {...props}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
    </div>
  );
}

/** Card-shaped skeleton for lists. */
export function CardSkeleton({ className, media = true }: { className?: string; media?: boolean }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border bg-surface p-4", className)} aria-hidden>
      {media && <Skeleton className="mb-4 aspect-[16/9] w-full rounded-xl" />}
      <Skeleton className="mb-3 h-4 w-24" />
      <Skeleton className="mb-2 h-5 w-4/5" />
      <Skeleton className="h-4 w-3/5" />
    </div>
  );
}

export function ListSkeleton({ count = 6, className, media = true }: { count?: number; className?: string; media?: boolean }) {
  return (
    <div className={cn("grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4", className)} role="status" aria-label="Loading">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} media={media} />
      ))}
    </div>
  );
}
