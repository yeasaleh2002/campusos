import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold [&_svg]:size-3",
  {
    variants: {
      tone: {
        neutral: "border-border bg-surface-2 text-fg-muted",
        primary: "border-transparent bg-primary-soft text-primary-soft-fg",
        accent: "border-transparent bg-accent-soft text-accent-soft-fg",
        success: "border-transparent bg-success-soft text-success",
        warning: "border-transparent bg-warning-soft text-warning",
        danger: "border-transparent bg-danger-soft text-danger",
        info: "border-transparent bg-info-soft text-info",
        saffron: "border-transparent bg-saffron-soft text-saffron",
        outline: "border-border-strong bg-transparent text-fg",
        glass: "glass text-fg",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;

export function Badge({ className, tone, ...props }: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
