"use client";

import { AnimatePresence, m } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { cn } from "@/lib/utils";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

/** Disclosure list (single open item by default). Buttons control regions via aria-expanded/aria-controls. */
export function Accordion({ items, className, defaultOpen = null }: { items: AccordionItem[]; className?: string; defaultOpen?: string | null }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpen);
  const baseId = useId();
  return (
    <div className={cn("divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface", className)}>
      {items.map((item) => {
        const open = item.id === openId;
        const panelId = `${baseId}-${item.id}`;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenId(open ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[0.95rem] font-semibold text-fg transition hover:bg-surface-2/60 sm:px-6"
              >
                <span>{item.title}</span>
                <ChevronDown className={cn("size-5 shrink-0 text-fg-subtle transition-transform duration-300", open && "rotate-180 text-primary")} aria-hidden />
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {open && (
                <m.div
                  id={panelId}
                  role="region"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 text-sm leading-relaxed text-fg-muted sm:px-6">{item.content}</div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
