"use client";

import { animate, useInView, useReducedMotion } from "framer-motion";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/** Animates a number from 0 when it scrolls into view (instant with reduced motion). */
export function CountUp({ value, duration = 1.4, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const reduced = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return;
    const format = (n: number) => Math.round(n).toLocaleString("en-US");
    if (reduced) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(0, value, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: (latest) => (node.textContent = format(latest)) });
    return () => controls.stop();
  }, [inView, value, duration, reduced]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)} aria-label={value.toLocaleString("en-US")}>
      0
    </span>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: "primary" | "accent" | "saffron" | "info";
  className?: string;
}

export function StatCard({ label, value, icon, hint, tone = "primary", className }: StatCardProps) {
  const toneClass = { primary: "bg-primary-soft text-primary-soft-fg", accent: "bg-accent-soft text-accent-soft-fg", saffron: "bg-saffron-soft text-saffron", info: "bg-info-soft text-info" }[tone];
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-5 shadow-xs", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-fg-muted">{label}</p>
        {icon && <span className={cn("grid size-9 place-items-center rounded-xl [&_svg]:size-[1.1rem]", toneClass)}>{icon}</span>}
      </div>
      <p className="mt-3 font-display text-3xl font-bold tracking-tight">
        <CountUp value={value} />
      </p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
