"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

/** Bell with a live unread badge (polls every minute while the tab is visible). */
export function NotificationBell({ href = "/dashboard/notifications" }: { href?: string }) {
  const { user } = useAuth();
  const { data } = useQuery({
    queryKey: queryKeys.unread,
    queryFn: () => api.get<{ unread: number }>("/api/notifications/unread-count", { notifyUnauthorized: false }),
    enabled: Boolean(user),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const unread = data?.unread ?? 0;
  return (
    <Link
      href={href}
      aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative grid size-10 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg"
    >
      <Bell className="size-5" />
      {unread > 0 && (
        <span className="absolute right-1 top-1 grid min-w-4.5 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4.5 text-white ring-2 ring-surface">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
