"use client";

import { type QueryKey, useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { api, type RequestOptions } from "@/lib/api-client";

interface CursorListOptions {
  /** Query parameters (empty values are dropped). `cursor` is managed here. */
  query?: RequestOptions["query"];
  enabled?: boolean;
  limit?: number;
  notifyUnauthorized?: boolean;
}

/** Cursor-paginated GET list on top of useInfiniteQuery; flattens pages into `items`. */
export function useCursorList<T>(queryKey: QueryKey, path: string, { query, enabled = true, limit = 12, notifyUnauthorized }: CursorListOptions = {}) {
  const result = useInfiniteQuery({
    queryKey: [...queryKey, query, limit],
    enabled,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => api.page<T[]>(path, { query: { ...query, limit, cursor: pageParam }, signal, notifyUnauthorized }),
    getNextPageParam: (last) => last.meta?.nextCursor ?? undefined,
  });
  const items = useMemo(() => result.data?.pages.flatMap((page) => page.data) ?? [], [result.data]);
  return { ...result, items };
}
