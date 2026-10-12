"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Bookmark, CalendarHeart, MessageSquareWarning, PackageSearch, Ticket, Upload } from "lucide-react";
import Link from "next/link";
import { EventCard } from "@/components/features/events/event-card";
import { type MyRegistrationRow, useRegistrationIndex, useSavedIndex } from "@/components/features/events/event-hooks";
import { useBookmarkIndex } from "@/components/features/resources/resource-hooks";
import { useAuth } from "@/components/providers/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { api } from "@/lib/api-client";
import { formatRelative } from "@/lib/format";
import { COMPLAINT_STATUS, labelOf } from "@/lib/labels";
import { queryKeys } from "@/lib/query-client";

interface ComplaintRow {
  id: string;
  ticketNo: string;
  subject: string;
  status: string;
  updatedAt: string;
}

interface NotificationRow {
  id: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

const QUICK_ACTIONS = [
  { href: "/events", label: "Find events", icon: Ticket },
  { href: "/dashboard/resources/upload", label: "Share notes", icon: Upload },
  { href: "/lost-found/new", label: "Post lost item", icon: PackageSearch },
  { href: "/complaints/new", label: "File complaint", icon: MessageSquareWarning },
] as const;

/** Signed-in home: stats, upcoming tickets, open tickets and latest notifications. */
export function DashboardOverview() {
  const { user } = useAuth();
  const registrations = useRegistrationIndex();
  const saved = useSavedIndex();
  const bookmarks = useBookmarkIndex();
  const unread = useQuery({ queryKey: queryKeys.unread, queryFn: () => api.get<{ unread: number }>("/api/notifications/unread-count"), enabled: Boolean(user) });
  const complaints = useQuery({ queryKey: [...queryKeys.myComplaints, "overview"], queryFn: () => api.get<ComplaintRow[]>("/api/me/complaints", { query: { limit: 20 } }), enabled: Boolean(user) });
  const notifications = useQuery({ queryKey: ["notifications", "overview"], queryFn: () => api.get<NotificationRow[]>("/api/notifications", { query: { limit: 4 } }), enabled: Boolean(user) });

  const upcoming = (registrations.data ?? [])
    .filter((row: MyRegistrationRow) => row.status === "REGISTERED" && new Date(row.event.endAt) > new Date())
    .sort((a, b) => new Date(a.event.startAt).getTime() - new Date(b.event.startAt).getTime())
    .slice(0, 3);
  const openComplaints = (complaints.data ?? []).filter((row) => row.status === "RECEIVED" || row.status === "IN_REVIEW");

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-h1 font-bold tracking-tight">Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}</h1>
        <p className="mt-2 text-lg text-fg-muted">Here is what is happening on your campus.</p>
      </header>

      <section aria-label="Summary" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <StatCard label="Upcoming tickets" value={upcoming.length} icon={<Ticket />} tone="primary" hint="Events you registered for" />
        <StatCard label="Saved events" value={saved.data?.length ?? 0} icon={<CalendarHeart />} tone="accent" hint="Your shortlist" />
        <StatCard label="Bookmarks" value={bookmarks.data?.length ?? 0} icon={<Bookmark />} tone="saffron" hint="Notes & questions" />
        <StatCard label="Unread alerts" value={unread.data?.unread ?? 0} icon={<Bell />} tone="info" hint={`${openComplaints.length} open complaint${openComplaints.length === 1 ? "" : "s"}`} />
      </section>

      <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className="group flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 font-semibold transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary-soft-fg transition group-hover:bg-primary group-hover:text-primary-fg">
              <Icon className="size-5" />
            </span>
            {label}
          </Link>
        ))}
      </section>

      <section aria-labelledby="upcoming-heading">
        <div className="mb-5 flex items-center justify-between">
          <h2 id="upcoming-heading" className="font-display text-h3 font-bold">
            Your next events
          </h2>
          <Link href="/dashboard/registrations" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            All tickets <ArrowRight className="size-4" />
          </Link>
        </div>
        {registrations.isPending ? (
          <div className="grid gap-5 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-72 rounded-2xl" />
            ))}
          </div>
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming events"
            description="Register for an event and its QR ticket will be waiting here."
            icon={<Ticket />}
            action={
              <Button asChild variant="gradient">
                <Link href="/events">Browse events</Link>
              </Button>
            }
          />
        ) : (
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {upcoming.map((row) => (
              <li key={row.id}>
                <EventCard event={row.event} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-2">
        <section aria-labelledby="notif-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="notif-heading" className="font-display text-h3 font-bold">
              Latest notifications
            </h2>
            <Link href="/dashboard/notifications" className="text-sm font-semibold text-primary hover:underline">
              See all
            </Link>
          </div>
          {notifications.isPending ? (
            <Skeleton className="h-48 rounded-2xl" />
          ) : (notifications.data ?? []).length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-fg-muted">Nothing new - enjoy the quiet.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {notifications.data?.map((row) => (
                <li key={row.id} className="p-4">
                  <p className="flex items-center gap-2 font-semibold">
                    {!row.readAt && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
                    {row.title}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-fg-muted">{row.body}</p>
                  <p className="mt-1 text-xs text-fg-subtle">{formatRelative(row.createdAt)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="tickets-heading">
          <div className="mb-5 flex items-center justify-between">
            <h2 id="tickets-heading" className="font-display text-h3 font-bold">
              Open complaints
            </h2>
            <Link href="/dashboard/complaints" className="text-sm font-semibold text-primary hover:underline">
              All complaints
            </Link>
          </div>
          {complaints.isPending ? (
            <Skeleton className="h-48 rounded-2xl" />
          ) : openComplaints.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-fg-muted">No open complaints.</p>
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
              {openComplaints.slice(0, 4).map((row) => {
                const status = labelOf(COMPLAINT_STATUS, row.status);
                return (
                  <li key={row.id} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <Link href={`/dashboard/complaints/${row.ticketNo}`} className="block truncate font-semibold hover:text-primary hover:underline">
                        {row.subject}
                      </Link>
                      <p className="font-mono text-xs text-fg-subtle">{row.ticketNo}</p>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
