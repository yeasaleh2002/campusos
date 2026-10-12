"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";

const subscribe = () => () => undefined;
/** true only after hydration (theme is unknown during SSR). */
function useMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

const ORDER = ["light", "dark", "system"] as const;
const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

/** Cycles light → dark → system. Persisted by next-themes (no flash: script in <head>). */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted && (theme === "light" || theme === "dark") ? theme : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
  const Icon = ICONS[current];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className={cn("grid size-10 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg", className)}
      aria-label={`Theme: ${current}. Switch to ${next}`}
      title={`Theme: ${current}`}
    >
      <Icon className="size-[1.15rem]" />
    </button>
  );
}

/** Segmented control for settings pages. */
export function ThemeSegmented() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const current = mounted ? (theme ?? "system") : null;
  return (
    <div role="radiogroup" aria-label="Theme" className="inline-flex rounded-xl border border-border bg-surface-2 p-1">
      {ORDER.map((value) => {
        const Icon = ICONS[value];
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={current === value}
            onClick={() => setTheme(value)}
            className={cn("inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium capitalize transition", current === value ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}
          >
            <Icon className="size-4" /> {value}
          </button>
        );
      })}
    </div>
  );
}
