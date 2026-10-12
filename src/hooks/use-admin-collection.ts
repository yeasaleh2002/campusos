"use client";

import { type InfiniteData, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useCursorList } from "@/hooks/use-cursor-list";
import type { PageResult, RequestOptions } from "@/lib/api-client";
import { toastPromise } from "@/lib/toast";

type Pages<T> = InfiniteData<PageResult<T[]>, string | undefined>;

interface MutationConfig<R> {
  request: () => Promise<R>;
  loading: string;
  success: string | ((result: R) => string);
  /** Appends "Public site updated" to the toast: the mutation expired public cache tags server-side. */
  publicSite?: boolean;
  onSuccess?: (result: R) => void;
}

/**
 * Admin table data: cursor list under the `["admin", key]` query namespace plus a
 * `mutate` helper that applies an optimistic change to every cached page, shows a
 * toast.promise, rolls back on failure and re-syncs from the server on success.
 */
export function useAdminCollection<T extends { id: string }>(key: string, path: string, query?: RequestOptions["query"], limit = 25) {
  const queryClient = useQueryClient();
  const namespace = ["admin", key] as const;
  const list = useCursorList<T>(namespace, path, { query, limit });

  const mutate = useCallback(
    async <R,>(config: MutationConfig<R>, optimistic?: (items: T[]) => T[]): Promise<R> => {
      const snapshots = queryClient.getQueriesData<Pages<T>>({ queryKey: namespace });
      if (optimistic) {
        queryClient.setQueriesData<Pages<T>>({ queryKey: namespace }, (old) => (old ? { ...old, pages: old.pages.map((page) => ({ ...page, data: optimistic(page.data) })) } : old));
      }
      const suffix = config.publicSite ? " Public site updated ✓" : "";
      try {
        const result = await toastPromise(config.request(), {
          loading: config.loading,
          success: (value) => `${typeof config.success === "function" ? config.success(value as R) : config.success}${suffix}`,
        });
        config.onSuccess?.(result);
        void queryClient.invalidateQueries({ queryKey: namespace });
        return result;
      } catch (error) {
        for (const [snapshotKey, data] of snapshots) queryClient.setQueryData(snapshotKey, data);
        throw error;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- namespace is derived from `key`
    [queryClient, key],
  );

  const patchItem = useCallback((id: string, patch: Partial<T>) => (items: T[]) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)), []);
  const removeItem = useCallback((id: string) => (items: T[]) => items.filter((item) => item.id !== id), []);

  return { ...list, mutate, patchItem, removeItem };
}
