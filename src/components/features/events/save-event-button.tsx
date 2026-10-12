"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useToggleSave } from "@/components/features/events/event-hooks";
import type { EventCardData } from "@/components/features/events/event-card";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";

/** Compact save/unsave toggle for event cards (optimistic; guests are sent to sign in). */
export function SaveEventButton({ event }: { event: EventCardData }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { isSaved, toggle, pending } = useToggleSave(event);

  return (
    <Button
      variant={isSaved ? "soft" : "ghost"}
      size="sm"
      aria-pressed={isSaved}
      aria-label={isSaved ? `Remove ${event.title} from saved events` : `Save ${event.title}`}
      disabled={pending}
      onClick={() => {
        if (!user) {
          router.push(`/login?next=${encodeURIComponent(pathname)}`);
          return;
        }
        toggle().catch(() => undefined);
      }}
    >
      {isSaved ? <BookmarkCheck /> : <Bookmark />} {isSaved ? "Saved" : "Save"}
    </Button>
  );
}
