"use client";

import { ArrowRightLeft, BusFront, Clock } from "lucide-react";
import { useMemo, useState } from "react";
import { type BusRouteData, DIRECTION_LABEL } from "@/components/features/bus/bus-types";
import { NoServiceCard } from "@/components/features/bus/service-status";
import { DepartureCountdown } from "@/components/features/bus/departure-countdown";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/states";
import { describeWorkingDays } from "@/config/campus-calendar";
import { useCampusClosures } from "@/hooks/use-campus-closures";
import { useDhakaNow } from "@/hooks/use-dhaka-now";
import { formatClock } from "@/lib/format";
import { busServiceStatus, describeDay, nextDepartures } from "@/server/domain/bus-schedule";

interface BusFinderProps {
  routes: BusRouteData[];
  /** Lock the finder to one route (route detail page). */
  fixedRoute?: string;
}

/** "When is my next bus?" - pick route, stop and direction; live countdown in Dhaka time. */
export function BusFinder({ routes, fixedRoute }: BusFinderProps) {
  const [routeCode, setRouteCode] = useState(fixedRoute ?? routes[0]?.code ?? "");
  const route = routes.find((item) => item.code === routeCode) ?? routes[0];
  const [stopName, setStopName] = useState<string>("");
  const [direction, setDirection] = useState<"TO_CAMPUS" | "FROM_CAMPUS">("TO_CAMPUS");
  const stop = route?.stops.find((item) => item.name === stopName) ?? route?.stops[0];

  // The timetable is cached (tag `buses`); "today" comes from the Dhaka clock and the cached closures,
  // so the answer is right after midnight and on off days without any time-based revalidation.
  const closures = useCampusClosures();
  const now = useDhakaNow();
  const view = useMemo(() => {
    if (!route || !stop || !now) return null;
    const options = { stop, direction, closures };
    return {
      status: busServiceStatus(route.trips, route.stops, now, options),
      departures: nextDepartures(route.trips, route.stops, now, { ...options, limit: 4 }),
    };
  }, [route, stop, direction, closures, now]);

  if (!route) return <EmptyState title="No bus routes yet" description="Routes will appear here once they are published." icon={<BusFront />} />;

  return (
    <section aria-label="Next bus finder" className="rounded-3xl border border-border bg-surface p-5 shadow-md sm:p-7">
      <div className="mb-5 flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-accent-soft text-accent-soft-fg">
          <Clock className="size-5" />
        </span>
        <div>
          <h2 className="font-display text-h3 font-bold">Next bus finder</h2>
          <p className="text-sm text-fg-muted">{`Times are Asia/Dhaka. Buses run ${describeWorkingDays()}; off days and holidays roll to the next service day.`}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {!fixedRoute && (
          <Field label="Route">
            <Select
              value={route.code}
              onChange={(event) => {
                setRouteCode(event.target.value);
                setStopName("");
              }}
            >
              {routes.map((item) => (
                <option key={item.id} value={item.code}>
                  {item.code} - {item.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Your stop">
          <Select value={stop?.name ?? ""} onChange={(event) => setStopName(event.target.value)}>
            {route.stops.map((item) => (
              <option key={item.name} value={item.name}>
                {item.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Direction">
          <div className="flex rounded-xl border border-border bg-surface-2 p-1" role="radiogroup" aria-label="Direction">
            {(["TO_CAMPUS", "FROM_CAMPUS"] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={direction === value}
                onClick={() => setDirection(value)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${direction === value ? "bg-surface text-primary shadow-sm" : "text-fg-muted hover:text-fg"}`}
              >
                {DIRECTION_LABEL[value]}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-6" aria-live="polite">
        {!view ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : view.departures.length === 0 ? (
          <div className="space-y-4">
            {!view.status.service && <NoServiceCard message={view.status.message} />}
            <EmptyState title="No upcoming buses found" description="This route has no active trips in this direction right now." icon={<ArrowRightLeft />} />
          </div>
        ) : (
          <div className="space-y-4">
            {!view.status.service && <NoServiceCard message={view.status.message} />}
            {view.status.service && view.status.noMoreToday && <p className="rounded-xl bg-surface-2 px-4 py-3 text-sm font-medium text-fg-muted">{view.status.message}</p>}
            <ul className="space-y-3">
              {view.departures.map((departure, index) => (
                <li key={`${departure.at.toISOString()}-${departure.direction}`} className={`flex items-center justify-between gap-4 rounded-2xl border p-4 ${index === 0 ? "border-primary/40 bg-primary-soft/50" : "border-border"}`}>
                  <div>
                    <p className="font-display text-2xl font-bold tabular-nums">{formatClock(departure.time)}</p>
                    <p className="text-sm text-fg-muted">
                      {describeDay(departure.dayOffset, departure.at)} · at {departure.stop}
                    </p>
                  </div>
                  <div className="text-right">
                    {/* The live countdown only runs for a trip that leaves today, on a service day. */}
                    {view.status.service && departure.dayOffset === 0 ? (
                      <DepartureCountdown at={departure.at.toISOString()} fallback={`in ${departure.minutesUntil} min`} className="text-lg font-semibold text-primary" />
                    ) : (
                      <span className="text-sm font-semibold text-fg-muted">{index === 0 ? "Service resumes" : "Then"}</span>
                    )}
                    {index === 0 && view.status.service && (
                      <Badge tone="success" className="ml-2 align-middle">
                        Next
                      </Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
