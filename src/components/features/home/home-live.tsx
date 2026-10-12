"use client";

import { ArrowRight, Bus, CalendarDays, FileText, HelpCircle, Users } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { DepartureCountdown } from "@/components/features/bus/departure-countdown";
import { NoServiceCard } from "@/components/features/bus/service-status";
import { EventCard, type EventCardData } from "@/components/features/events/event-card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/ui/stat-card";
import { campusWeekRange } from "@/config/campus-calendar";
import { useCampusClosures } from "@/hooks/use-campus-closures";
import { useDhakaNow } from "@/hooks/use-dhaka-now";
import { formatClock, formatDate, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import { busServiceStatus, describeDay, nextDepartures } from "@/server/domain/bus-schedule";
import type { BusRouteView } from "@/server/queries/campus.queries";
import type { HomeFeed } from "@/server/queries/home.queries";

/*
 * The landing page is prerendered from one tag-cached entry (see `getHomeFeed`). These client pieces finish the
 * parts that depend on the real current time in the browser, so the page itself never needs a request-time render.
 */

/** "2 hours ago", filled in after mount; the prerendered text is the plain date. */
export function RelativeTime({ value, className }: { value: Date | string; className?: string }) {
  const now = useDhakaNow(60_000);
  return (
    <span className={className} suppressHydrationWarning>
      {now ? formatRelative(value, now) : formatDate(value)}
    </span>
  );
}

export function HomeStats({ stats, eventEnds }: { stats: HomeFeed["stats"]; eventEnds: string[] }) {
  const now = useDhakaNow(5 * 60_000);
  const upcoming = useMemo(() => (now ? eventEnds.filter((end) => new Date(end).getTime() >= now.getTime()).length : stats.upcomingAtFill), [now, eventEnds, stats.upcomingAtFill]);
  const items = [
    { label: "Upcoming events", value: upcoming, icon: <CalendarDays />, tone: "primary" as const, hint: "Across all clubs" },
    { label: "Notes & questions", value: stats.resources, icon: <FileText />, tone: "saffron" as const, hint: "Peer-reviewed uploads" },
    { label: "Active clubs", value: stats.clubs, icon: <Users />, tone: "accent" as const, hint: "Find your people" },
    { label: "Verified answers", value: stats.helpdeskAnswers, icon: <HelpCircle />, tone: "info" as const, hint: `${stats.busRoutes} bus routes covered` },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((item) => (
        <StatCard key={item.label} {...item} className="glass" />
      ))}
    </div>
  );
}

const MAX_CARDS = 8;

/** This campus week's events (Friday to Thursday, Dhaka); falls back to the next upcoming ones. */
export function HomeEvents({ events }: { events: EventCardData[] }) {
  const now = useDhakaNow(5 * 60_000);
  const { items, label } = useMemo(() => {
    if (!now) return { items: events.slice(0, MAX_CARDS), label: "Coming up" };
    const live = events.filter((event) => new Date(event.endAt).getTime() >= now.getTime());
    const week = campusWeekRange(now);
    const thisWeek = live.filter((event) => {
      const start = new Date(event.startAt).getTime();
      return start >= week.start.getTime() && start < week.end.getTime();
    });
    return thisWeek.length > 0 ? { items: thisWeek.slice(0, MAX_CARDS), label: "This week" } : { items: live.slice(0, MAX_CARDS), label: "Coming up" };
  }, [events, now]);

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border-strong bg-surface/60 p-10 text-center text-fg-muted">
        No events scheduled yet - clubs publish new ones every week. <Link href="/clubs" className="font-semibold text-primary hover:underline">Browse clubs</Link>
      </div>
    );
  }
  return (
    <div>
      <p className="sr-only">{label}</p>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:overflow-visible lg:px-0 2xl:grid-cols-4">
        {items.map((event, index) => (
          <li key={event.id} className={cn("w-[82%] shrink-0 snap-start sm:w-[45%] lg:w-auto", index >= 6 && "lg:hidden 2xl:block")}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Next buses to campus, worked out in the browser from the cached timetable, the Dhaka clock and the closures. */
export function NextBusPanel({ routes }: { routes: BusRouteView[] }) {
  const now = useDhakaNow();
  const closures = useCampusClosures();
  const view = useMemo(() => {
    if (!now) return null;
    const status = routes[0] ? busServiceStatus(routes[0].trips, routes[0].stops, now, { closures }) : null;
    const rows = routes
      .map((route) => ({ route, next: nextDepartures(route.trips, route.stops, now, { direction: "TO_CAMPUS", limit: 1, closures })[0] }))
      .filter((row): row is typeof row & { next: NonNullable<typeof row.next> } => Boolean(row.next))
      .sort((a, b) => a.next.at.getTime() - b.next.at.getTime())
      .slice(0, 4);
    return { status, rows };
  }, [routes, now, closures]);

  return (
    <div className="glass flex h-full flex-col rounded-3xl p-5 shadow-md sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
          <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-soft-fg">
            <Bus className="size-[1.1rem]" />
          </span>
          Next buses to campus
        </h3>
        <span className="flex items-center gap-1.5 text-xs font-medium text-fg-subtle">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          Dhaka time
        </span>
      </div>
      {!view ? (
        <ul className="space-y-2" aria-hidden>
          {[0, 1, 2, 3].map((index) => (
            <li key={index}>
              <Skeleton className="h-16 rounded-2xl" />
            </li>
          ))}
        </ul>
      ) : (
        <>
          {view.status && !view.status.service && <NoServiceCard compact message={view.status.message} className="mb-3" />}
          {view.rows.length === 0 ? (
            <p className="py-6 text-sm text-fg-muted">No upcoming trips in the next 14 days.</p>
          ) : (
            <ul className="space-y-2">
              {view.rows.map(({ route, next }) => (
                <li key={route.id}>
                  <Link href={`/bus/${route.code}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/70 p-3 transition hover:border-accent/50 hover:bg-surface">
                    <span className="grid h-10 min-w-12 place-items-center rounded-xl bg-brand-gradient px-2 font-display text-sm font-bold text-white">{route.code}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{route.name}</span>
                      <span className="block truncate text-xs text-fg-subtle">
                        {next.stop} · {formatClock(next.time)}
                        {next.dayOffset > 0 ? ` ${describeDay(next.dayOffset, next.at)}` : ""}
                      </span>
                    </span>
                    {view.status?.service && next.dayOffset === 0 ? (
                      <DepartureCountdown at={next.at.toISOString()} fallback={formatClock(next.time)} className="shrink-0 rounded-lg bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent-soft-fg" />
                    ) : (
                      <span className="shrink-0 rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-fg-muted">{formatClock(next.time)}</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      <Link href="/bus" className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline">
        Full timetable & stop finder <ArrowRight className="size-4" />
      </Link>
    </div>
  );
}
