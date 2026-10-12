"use client";

import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { cn } from "@/lib/utils";

interface OverlayProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  /** Hide the visible title (still announced to screen readers). */
  hideTitle?: boolean;
}

/** Locks page scroll while an overlay is open (handles nested overlays). */
function useScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [locked]);
}

/** Portals only after mount (avoids SSR/hydration mismatch). */
function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  return mounted ? createPortal(children, document.body) : null;
}

function OverlayShell({ open, onClose, title, description, children, footer, className, hideTitle, variant }: OverlayProps & { variant: "dialog" | "sheet-right" | "sheet-left" | "sheet-bottom" }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  useFocusTrap(panelRef, open, onClose);
  useScrollLock(open);

  const motionProps = {
    dialog: { initial: { opacity: 0, scale: 0.96, y: 12 }, animate: { opacity: 1, scale: 1, y: 0 }, exit: { opacity: 0, scale: 0.97, y: 8 } },
    "sheet-right": { initial: { x: "100%" }, animate: { x: 0 }, exit: { x: "100%" } },
    "sheet-left": { initial: { x: "-100%" }, animate: { x: 0 }, exit: { x: "-100%" } },
    "sheet-bottom": { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } },
  }[variant];

  const placement = {
    dialog: "fixed inset-0 m-auto h-fit max-h-[min(90dvh,56rem)] w-[calc(100%-2rem)] max-w-lg rounded-2xl",
    "sheet-right": "fixed inset-y-0 right-0 h-dvh w-[min(26rem,92vw)] rounded-l-2xl",
    "sheet-left": "fixed inset-y-0 left-0 h-dvh w-[min(22rem,88vw)] rounded-r-2xl",
    "sheet-bottom": "fixed inset-x-0 bottom-0 max-h-[88dvh] w-full rounded-t-3xl",
  }[variant];

  return (
    <Portal>
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0" style={{ zIndex: "var(--z-modal)" }}>
            <m.div
              className="absolute inset-0 bg-overlay backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              aria-hidden
            />
            <m.div
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-describedby={description ? descId : undefined}
              tabIndex={-1}
              className={cn("flex flex-col overflow-hidden border border-border bg-surface shadow-lg outline-none", placement, className)}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
              {...motionProps}
            >
              <div className={cn("flex items-start justify-between gap-4 px-5 pt-5 sm:px-6", hideTitle && "sr-only")}>
                <div>
                  <h2 id={titleId} className="font-display text-lg font-semibold tracking-tight">{title}</h2>
                  {description && <p id={descId} className="mt-1 text-sm text-fg-muted">{description}</p>}
                </div>
                <button type="button" onClick={onClose} className="-mr-2 -mt-1 rounded-lg p-2 text-fg-subtle transition hover:bg-surface-2 hover:text-fg" aria-label="Close">
                  <X className="size-5" />
                </button>
              </div>
              <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">{children}</div>
              {footer && <div className="flex flex-wrap justify-end gap-3 border-t border-border bg-surface-2/50 px-5 py-4 sm:px-6">{footer}</div>}
            </m.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}

/** Centered modal dialog. */
export function Dialog(props: OverlayProps) {
  return <OverlayShell {...props} variant="dialog" />;
}

/** Slide-in drawer (right by default, bottom sheet on mobile when `side="bottom"`). */
export function Sheet({ side = "right", ...props }: OverlayProps & { side?: "left" | "right" | "bottom" }) {
  return <OverlayShell {...props} variant={`sheet-${side}`} />;
}
