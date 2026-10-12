"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Filter state kept in the URL (shareable, back-button friendly).
 * `set` merges changes; empty values and defaults are removed from the query string.
 */
export function useUrlFilters<K extends string>(defaults: Record<K, string>) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const keys = Object.keys(defaults) as K[];

  const values = Object.fromEntries(keys.map((key) => [key, params.get(key) ?? defaults[key]])) as Record<K, string>;

  const set = useCallback(
    (changes: Partial<Record<K, string>>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes) as Array<[K, string | undefined]>) {
        if (!value || value === defaults[key]) next.delete(key);
        else next.set(key, value);
      }
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [params, defaults, pathname, router],
  );

  const reset = useCallback(() => router.replace(pathname, { scroll: false }), [pathname, router]);
  const activeCount = keys.filter((key) => values[key] !== defaults[key]).length;

  return { values, set, reset, activeCount };
}
