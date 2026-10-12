"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, CircleDot } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ListView } from "@/components/ui/list-view";
import { Tabs } from "@/components/ui/tabs";
import { useCursorList } from "@/hooks/use-cursor-list";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";
import { queryKeys } from "@/lib/query-client";
import { toastPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const TABS = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
] as const;

/** Notification centre with mark-read and mark-all-read. A notification is plain text: clicking it never navigates. */
export function NotificationsList() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("all");
  const queryClient = useQueryClient();
  const unreadOnly = tab === "unread";
  const list = useCursorList<NotificationRow>(["notifications", "list", unreadOnly], "/api/notifications", { query: { unreadOnly: unreadOnly || undefined }, limit: 20 });

  const afterChange = () => Promise.all([queryClient.invalidateQueries({ queryKey: ["notifications"] }), queryClient.invalidateQueries({ queryKey: queryKeys.unread })]);

  const markRead = useMutation({
    mutationFn: (id: string) => api.patch(`/api/notifications/${id}/read`),
    onSettled: afterChange,
  });
  const markAll = useMutation({ mutationFn: () => api.post<{ marked: number }>("/api/notifications/read-all"), onSettled: afterChange });
  const hasUnread = list.items.some((row) => !row.readAt);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs label="Notification filter" items={[...TABS]} value={tab} onValueChange={setTab} />
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasUnread || markAll.isPending}
          onClick={() => void toastPromise(markAll.mutateAsync(), { loading: "Marking…", success: (result) => `${(result as { marked: number }).marked} marked as read.` }).catch(() => undefined)}
        >
          <CheckCheck /> Mark all read
        </Button>
      </div>
      <ListView
        list={list}
        getKey={(row) => row.id}
        className="space-y-2"
        media={false}
        renderItem={(row) => (
          <div className={cn("flex items-start gap-3 rounded-2xl border p-4 transition", row.readAt ? "border-border bg-surface" : "border-primary/30 bg-primary-soft/40")}>
            <span className={cn("mt-1 grid size-9 shrink-0 place-items-center rounded-xl", row.readAt ? "bg-surface-2 text-fg-subtle" : "bg-primary text-primary-fg")}>
              {row.readAt ? <Bell className="size-4" /> : <BellRing className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold [overflow-wrap:anywhere]">{row.title}</p>
              <p className="mt-0.5 text-sm text-fg-muted [overflow-wrap:anywhere]">{row.body}</p>
              <p className="mt-1 text-xs text-fg-subtle">{formatRelative(row.createdAt)}</p>
            </div>
            {!row.readAt && (
              <Button variant="ghost" size="icon-sm" aria-label={`Mark "${row.title}" as read`} onClick={() => markRead.mutate(row.id)}>
                <CircleDot />
              </Button>
            )}
          </div>
        )}
        empty={{ title: unreadOnly ? "You are all caught up" : "No notifications yet", description: "Updates on your tickets, claims and followed clubs appear here.", icon: <Bell /> }}
      />
    </div>
  );
}
