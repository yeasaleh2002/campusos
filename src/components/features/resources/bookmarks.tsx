"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { ResourceCard } from "@/components/features/resources/resource-card";
import { type BookmarkRow } from "@/components/features/resources/resource-hooks";
import { Button } from "@/components/ui/button";
import { ListView } from "@/components/ui/list-view";
import { useCursorList } from "@/hooks/use-cursor-list";
import { queryKeys } from "@/lib/query-client";

/** Bookmarked resources; un-bookmarking updates the shared index optimistically. */
export function Bookmarks() {
  const list = useCursorList<BookmarkRow>(queryKeys.bookmarks, "/api/me/bookmarks");
  return (
    <ListView
      list={list}
      getKey={(row) => row.id}
      className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3"
      media={false}
      renderItem={(row) => (
        <ResourceCard
          resource={{
            description: null,
            semester: null,
            year: null,
            tags: [],
            fileSize: 0,
            bookmarkCount: 0,
            isSample: false,
            createdAt: row.createdAt,
            ...row.resource,
          }}
        />
      )}
      empty={{
        title: "No bookmarks yet",
        description: "Tap the bookmark on any resource to keep it handy before exams.",
        icon: <Bookmark />,
        action: (
          <Button asChild variant="gradient">
            <Link href="/resources">Browse resources</Link>
          </Button>
        ),
      }}
    />
  );
}
