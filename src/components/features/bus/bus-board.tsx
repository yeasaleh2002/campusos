"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BusFront, MapPin } from "lucide-react";
import Link from "next/link";
import { BusFinder } from "@/components/features/bus/bus-finder";
import { type BusRouteData } from "@/components/features/bus/bus-types";
import { DepartureCountdown } from "@/components/features/bus/departure-countdown";
import { NoServiceCard } from "@/components/features/bus/service-status";
import { Badge } from "@/components/ui/badge";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useCampusClosures } from "@/hooks/use-campus-closures";
import { useDhakaNow } from "@/hooks/use-dhaka-now";
import { api } from "@/lib/api-client";
import { formatClock } from "@/lib/format";
import { busServiceStatus, describeDay, nextDepartures } from "@/server/domain/bus-schedule";

/** Bus hub: next-bus finder plus a card per route with its soonest departure. */
export function BusBoard() {
  const routes = useQuery({ queryKey: ["bus", "routes"], queryFn: () => api.get<BusRouteData[]>("/api/bus/routes"), staleTime: 5 * 60_000 });
  const closures = useCampusClosures();
  const now = useDhakaNow();

  if (routes.isPending || !now) return <ListSkeleton count={4} media={false} />;
  if (routes.isError) return <ErrorState error={routes.error} onRetry={() => void routes.refetch()} />;
  if (routes.data.length === 0) return <EmptyState title="No bus routes yet" icon={<BusFront />} />;

  const first = routes.data[0];
  const today = busServiceStatus(first.trips, first.stops, now, { closures });
  return (
    <div className="space-y-10">
      {!today.service && <NoServiceCard message={today.message} />}
      <BusFinder routes={routes.data} />
      <section aria-labelledby="routes-heading">
        <h2 id="routes-heading" className="mb-5 font-display text-h2 font-bold">
          All routes
        </h2>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {routes.data.map((route) => {
            const next = nextDepartures(route.trips, route.stops, now, { direction: "TO_CAMPUS", limit: 1, closures })[0];
            return (
              <li key={route.id}>
                <article className="group relative flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-xs transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg focus-within:ring-2 focus-within:ring-ring">
                  <div className="flex items-center justify-between">
                    <Badge tone="primary">{route.code}</Badge>
                    <span className="text-xs text-fg-subtle">{route.stops.length} stops</span>
                  </div>
                  <h3 className="font-display text-lg font-semibold">
                    <Link href={`/bus/${route.code}`} className="outline-none after:absolute after:inset-0 after:content-['']">
                      {route.name}
                    </Link>
                  </h3>
                  <p className="flex items-center gap-2 text-sm text-fg-muted">
                    <MapPin className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                    <span className="truncate">
                      {route.stops[0]?.name} → Campus ({route.stops[route.stops.length - 1]?.offsetMinutes} min)
                    </span>
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-4">
                    {next ? (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Next to campus</p>
                        <p className="font-display text-xl font-bold tabular-nums">{formatClock(next.time)}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-fg-muted">No upcoming trips</p>
                    )}
                    {next && today.service && next.dayOffset === 0 ? (
                      <DepartureCountdown at={next.at.toISOString()} fallback="soon" className="text-sm font-semibold text-primary" />
                    ) : next ? (
                      <span className="text-sm font-semibold text-fg-muted">{describeDay(next.dayOffset, next.at)}</span>
                    ) : null}
                    <ArrowRight className="size-5 text-fg-subtle transition group-hover:translate-x-1 group-hover:text-primary" aria-hidden />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
