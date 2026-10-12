"use client";

import type { ReactNode } from "react";
import { InfiniteList } from "@/components/ui/infinite-list";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";

interface ListViewProps<T> {
  list: {
    items: T[];
    isPending: boolean;
    isError: boolean;
    error: unknown;
    refetch: () => unknown;
    hasNextPage: boolean;
    isFetchingNextPage: boolean;
    fetchNextPage: () => unknown;
    isFetching: boolean;
  };
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  empty: { title: string; description?: string; action?: ReactNode; icon?: ReactNode };
  className?: string;
  skeletonCount?: number;
  media?: boolean;
}

/** Standard loading / error / empty / infinite-scroll states for a cursor list. */
export function ListView<T>({ list, getKey, renderItem, empty, className, skeletonCount = 6, media = true }: ListViewProps<T>) {
  if (list.isPending) return <ListSkeleton count={skeletonCount} media={media} className={className} />;
  if (list.isError) return <ErrorState error={list.error} onRetry={() => void list.refetch()} />;
  if (list.items.length === 0) return <EmptyState title={empty.title} description={empty.description} action={empty.action} icon={empty.icon} />;
  return (
    <div aria-busy={list.isFetching && !list.isFetchingNextPage}>
      <InfiniteList
        items={list.items}
        getKey={getKey}
        renderItem={renderItem}
        hasNextPage={list.hasNextPage}
        isFetchingNextPage={list.isFetchingNextPage}
        fetchNextPage={() => void list.fetchNextPage()}
        className={className}
      />
    </div>
  );
}
