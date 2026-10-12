"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { BusFinder } from "@/components/features/bus/bus-finder";
import { type BusRouteData, DIRECTION_LABEL } from "@/components/features/bus/bus-types";
import { NoServiceCard, WeekdayPicker } from "@/components/features/bus/service-status";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { type Weekday, describeOffDays, describeWorkingDays, isOffWeekday, weekdayName } from "@/config/campus-calendar";
import { useCampusClosures } from "@/hooks/use-campus-closures";
import { useDhakaNow } from "@/hooks/use-dhaka-now";
import { api } from "@/lib/api-client";
import { formatClock } from "@/lib/format";
import { busServiceStatus, dhakaClock, describeDays, toMinutes, todaysTrips, tripsOnWeekday } from "@/server/domain/bus-schedule";
import { cn } from "@/lib/utils";

/**
 * Live part of the route page: next-bus finder + a timetable with a Friday-first weekday selector.
 * The timetable is cached (tag `buses`); "today" is resolved here from the Dhaka clock and the
 * cached closures, so the page is correct after midnight without any time-based revalidation.
 */
export function RouteLive({ initial }: { initial: BusRouteData }) {
  const route = useQuery({ queryKey: ["bus", "route", initial.code], queryFn: () => api.get<BusRouteData>(`/api/bus/routes/${initial.code}`), initialData: initial, staleTime: 5 * 60_000 });
  const closures = useCampusClosures();
  const now = useDhakaNow();
  const [picked, setPicked] = useState<Weekday | null>(null);

  if (route.isError) return <ErrorState error={route.error} onRetry={() => void route.refetch()} />;
  if (!route.data) return <Skeleton className="h-96 rounded-3xl" />;

  return (
    <div className="space-y-8">
      <BusFinder routes={[route.data]} fixedRoute={route.data.code} />
      {now ? <Timetable route={route.data} now={now} closures={closures} picked={picked} onPick={setPicked} /> : <Skeleton className="h-72 rounded-3xl" />}
    </div>
  );
}

interface TimetableProps {
  route: BusRouteData;
  now: Date;
  closures: ReturnType<typeof useCampusClosures>;
  picked: Weekday | null;
  onPick: (weekday: Weekday | null) => void;
}

function Timetable({ route, now, closures, picked, onPick }: TimetableProps) {
  const clock = dhakaClock(now);
  const today = clock.dayOfWeek as Weekday;
  const selected = picked ?? today;
  const viewingToday = selected === today;

  const status = busServiceStatus(route.trips, route.stops, now, { closures });
  const trips = viewingToday ? todaysTrips(route.trips, now, closures) : tripsOnWeekday(route.trips, selected);
  const offMessage = viewingToday ? status.message : `${weekdayName(selected)} is a weekly off day. Buses run ${describeWorkingDays()}.`;
  const showOff = viewingToday ? !status.service : isOffWeekday(selected);

  return (
    <section aria-labelledby="timetable-heading" className="rounded-3xl border border-border bg-surface p-5 sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary-soft-fg">
          <CalendarClock className="size-5" />
        </span>
        <div>
          <h2 id="timetable-heading" className="font-display text-h3 font-bold">
            {viewingToday ? "Today's timetable" : `${weekdayName(selected)} timetable`}
          </h2>
          <p className="text-sm text-fg-muted">Departure from the first stop (to campus) or from campus.</p>
        </div>
      </div>
      <div className="mb-5">
        <WeekdayPicker selected={selected} today={today} onSelect={(weekday) => onPick(weekday === today ? null : weekday)} />
      </div>
      {showOff ? (
        <NoServiceCard message={offMessage} />
      ) : trips.length === 0 ? (
        <p className="rounded-xl bg-surface-2 p-4 text-fg-muted">No trips are scheduled on {weekdayName(selected)}.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => {
            const gone = viewingToday && toMinutes(trip.departureTime) < clock.minutes;
            return (
              <li key={trip.id} className={cn("flex items-center justify-between rounded-xl border border-border p-3", gone && "opacity-50")}>
                <span className="font-display text-lg font-bold tabular-nums">{formatClock(trip.departureTime)}</span>
                <Badge tone={trip.direction === "TO_CAMPUS" ? "primary" : "accent"}>{DIRECTION_LABEL[trip.direction]}</Badge>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-4 text-xs text-fg-subtle">Runs {describeDays([...new Set(route.trips.flatMap((trip) => trip.daysOfWeek))])}. No service on {describeOffDays()}.</p>
    </section>
  );
}
