"use client";

import { m } from "framer-motion";
import { type ReactNode, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface InfiniteListProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T, index: number) => ReactNode;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
  className?: string;
  /** Stagger the reveal of the first page. */
  animate?: boolean;
}

/**
 * Cursor-paginated list: an IntersectionObserver sentinel loads the next page
 * 600px before the end; a "Load more" button remains as a keyboard/no-JS-IO fallback.
 */
export function InfiniteList<T>({ items, getKey, renderItem, hasNextPage, isFetchingNextPage, fetchNextPage, className, animate = true }: InfiniteListProps<T>) {
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) fetchNextPage();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return (
    <>
      <ul className={className} aria-busy={isFetchingNextPage}>
        {items.map((item, index) => (
          <m.li
            key={getKey(item)}
            className="min-w-0 list-none"
            initial={animate ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: animate ? Math.min(index % 12, 8) * 0.04 : 0, ease: [0.22, 1, 0.36, 1] }}
          >
            {renderItem(item, index)}
          </m.li>
        ))}
      </ul>
      <div ref={sentinel} className={cn("flex justify-center py-6", !hasNextPage && "hidden")}>
        {isFetchingNextPage ? (
          <Spinner className="text-primary" label="Loading more" />
        ) : (
          <Button variant="secondary" size="sm" onClick={fetchNextPage}>
            Load more
          </Button>
        )}
      </div>
    </>
  );
}
