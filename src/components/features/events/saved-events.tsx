"use client";

import { Bookmark } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/features/events/event-card";
import { type SavedEventRow } from "@/components/features/events/event-hooks";
import { SaveEventButton } from "@/components/features/events/save-event-button";
import { Button } from "@/components/ui/button";
import { ListView } from "@/components/ui/list-view";
import { useCursorList } from "@/hooks/use-cursor-list";
import { queryKeys } from "@/lib/query-client";

/** Events the user bookmarked; the save toggle removes them optimistically. */
export function SavedEvents() {
  const list = useCursorList<SavedEventRow>(queryKeys.savedEvents, "/api/me/saved-events");
  return (
    <ListView
      list={list}
      getKey={(row) => row.id}
      className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
      renderItem={(row) => <EventCard event={row.event} action={<SaveEventButton event={row.event} />} />}
      empty={{
        title: "Nothing saved yet",
        description: "Tap Save on any event to keep it here for later.",
        icon: <Bookmark />,
        action: (
          <Button asChild variant="gradient">
            <Link href="/events">Find events</Link>
          </Button>
        ),
      }}
    />
  );
}
