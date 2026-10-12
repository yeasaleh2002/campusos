"use client";

import { Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import { useModHotkey } from "@/hooks/use-hotkey";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "campusos:open-palette";
const CommandPalette = dynamic(() => import("@/components/shared/command-palette").then((mod) => mod.CommandPalette), { ssr: false });

/** Opens the palette from anywhere (e.g. a hero search button). */
export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

/**
 * Mounted once in the root layout: listens for Ctrl/⌘+K and the open event,
 * and only downloads the palette code the first time it opens.
 */
export function CommandPaletteHost() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const show = useCallback(() => {
    setLoaded(true);
    setOpen(true);
  }, []);
  useModHotkey("k", show);
  useEffect(() => {
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, [show]);
  return loaded ? <CommandPalette open={open} onClose={() => setOpen(false)} /> : null;
}

/** Search pill for the navbar. */
export function SearchTrigger({ className, compact }: { className?: string; compact?: boolean }) {
  if (compact) {
    return (
      <button type="button" onClick={openCommandPalette} className={cn("grid size-10 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg", className)} aria-label="Search CampusOS (Ctrl+K)">
        <Search className="size-[1.15rem]" />
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className={cn("group flex h-10 w-full items-center gap-2.5 rounded-xl border border-border bg-surface-2/60 px-3.5 text-sm text-fg-subtle transition hover:border-border-strong hover:bg-surface-2", className)}
      aria-label="Search CampusOS (Ctrl+K)"
    >
      <Search className="size-4" />
      <span className="flex-1 truncate text-left">Search…</span>
    </button>
  );
}
