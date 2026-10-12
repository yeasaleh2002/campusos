"use client";

import { useEffect } from "react";

/** Calls `handler` for Ctrl/⌘ + `key` (e.g. "k"), ignoring held repeats. */
export function useModHotkey(key: string, handler: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === key && !event.repeat) {
        event.preventDefault();
        handler();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key, handler]);
}
