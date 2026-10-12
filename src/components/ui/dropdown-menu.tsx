"use client";

import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { type KeyboardEvent, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type MenuItem =
  /** `external` links (other sites) open in a new tab. */
  | { type?: "link"; label: ReactNode; href: string; icon?: ReactNode; external?: boolean }
  | { type: "action"; label: ReactNode; onSelect: () => void; icon?: ReactNode; danger?: boolean }
  | { type: "separator" };

interface DropdownMenuProps {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  items: MenuItem[];
  header?: ReactNode;
  align?: "start" | "end";
  className?: string;
}

/** Menu button pattern: Enter/Space/↓ to open, ↑/↓ to move, Esc to close, click-outside closes. */
export function DropdownMenu({ trigger, items, header, align = "end", className }: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    const frame = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus());
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      cancelAnimationFrame(frame);
    };
  }, [open]);

  const onMenuKeyDown = (event: KeyboardEvent) => {
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? []);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      rootRef.current?.querySelector<HTMLElement>("[aria-haspopup]")?.focus();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      nodes[(index + 1) % nodes.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      nodes[(index - 1 + nodes.length) % nodes.length]?.focus();
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const itemClass = "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium text-fg outline-none transition hover:bg-surface-2 focus:bg-surface-2 [&_svg]:size-4 [&_svg]:text-fg-subtle";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {trigger({ open, toggle: () => setOpen((v) => !v), id })}
      <AnimatePresence>
        {open && (
          <m.div
            ref={menuRef}
            id={id}
            role="menu"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            style={{ zIndex: "var(--z-popover)" }}
            className={cn("absolute top-full mt-2 min-w-56 origin-top rounded-xl border border-border bg-surface p-1.5 shadow-lg", align === "end" ? "right-0" : "left-0")}
          >
            {header && <div className="border-b border-border px-3 pb-2.5 pt-1.5">{header}</div>}
            {items.map((item, index) => {
              if (item.type === "separator") return <div key={index} role="separator" className="my-1.5 h-px bg-border" />;
              if (item.type === "action") {
                return (
                  <button
                    key={index}
                    type="button"
                    role="menuitem"
                    className={cn(itemClass, item.danger && "text-danger [&_svg]:text-danger")}
                    onClick={() => {
                      setOpen(false);
                      item.onSelect();
                    }}
                  >
                    {item.icon}
                    {item.label}
                  </button>
                );
              }
              if (item.external) {
                return (
                  <a key={index} role="menuitem" href={item.href} target="_blank" rel="noopener noreferrer" className={itemClass} onClick={() => setOpen(false)}>
                    {item.icon}
                    {item.label}
                  </a>
                );
              }
              return (
                <Link key={index} role="menuitem" href={item.href} className={itemClass} onClick={() => setOpen(false)}>
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
