"use client";

import { Search } from "lucide-react";
import { openCommandPalette } from "@/components/shared/command-palette-trigger";

/** Big hero search pill that opens the Ctrl+K palette. */
export function HeroSearch() {
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className="glass group flex h-14 w-full max-w-xl items-center gap-3 rounded-2xl px-5 text-left text-fg-subtle shadow-md transition hover:shadow-lg"
      aria-label="Search CampusOS"
    >
      <Search className="size-5 text-primary" aria-hidden />
      <span className="flex-1 truncate">Try &ldquo;CSE-2201 questions&rdquo;, &ldquo;next bus Mirpur&rdquo;…</span>
      <kbd className="hidden rounded-lg border border-border bg-surface px-2 py-1 text-xs font-semibold text-fg-muted sm:inline">Ctrl K</kbd>
    </button>
  );
}
