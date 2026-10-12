"use client";

import { BUS_SERVICE_DAYS, describeOffDays, describeWorkingDays, weekdayShort } from "@/config/campus-calendar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Bus, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { type DragEvent, useState } from "react";
import { AdminPage, Panel } from "@/components/admin/kit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/choice";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { DIRECTION_LABEL } from "@/components/features/bus/bus-types";
import { api, errorMessage } from "@/lib/api-client";
import { toast, toastPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";

type Direction = "TO_CAMPUS" | "FROM_CAMPUS";

interface Stop {
  name: string;
  offsetMinutes: number;
}

interface Trip {
  id: string;
  departureTime: string;
  direction: Direction;
  daysOfWeek: number[];
  isActive: boolean;
}

interface Route {
  id: string;
  code: string;
  name: string;
  stops: Stop[];
  notes: string | null;
  isActive: boolean;
  trips: Trip[];
}

interface Departure {
  direction: Direction;
  stop: string;
  time: string;
  minutesUntil: number;
  dayOffset: number;
}

/** Trips can only run on bus service days (Friday to Tuesday); the weekly off days are not offered. */
const ROUTES_KEY = ["admin", "bus-routes"] as const;

/** Returns a message when offsets are invalid (mirrors the server's rules so errors show before saving). */
function stopsProblem(stops: Stop[]): string | null {
  if (stops.length < 2) return "A route needs at least two stops.";
  if (stops.some((stop) => stop.name.trim().length < 2)) return "Every stop needs a name.";
  if (stops[0].offsetMinutes !== 0) return "The first stop must be at 0 minutes.";
  if (stops.some((stop, index) => index > 0 && stop.offsetMinutes <= stops[index - 1].offsetMinutes)) return "Minutes must increase from stop to stop.";
  return null;
}

function StopsEditor({ route }: { route: Route }) {
  const queryClient = useQueryClient();
  const [stops, setStops] = useState<Stop[]>(route.stops);
  const [name, setName] = useState(route.name);
  const [notes, setNotes] = useState(route.notes ?? "");
  const [active, setActive] = useState(route.isActive);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const problem = stopsProblem(stops);

  /** Moves a stop's NAME to a new position; minute offsets stay in their slots so timing stays valid. */
  const move = (from: number, to: number) => {
    if (to < 0 || to >= stops.length || from === to) return;
    const names = stops.map((stop) => stop.name);
    const [moved] = names.splice(from, 1);
    names.splice(to, 0, moved);
    setStops(stops.map((stop, index) => ({ ...stop, name: names[index] })));
  };

  const onDrop = (event: DragEvent, to: number) => {
    event.preventDefault();
    if (dragFrom !== null) move(dragFrom, to);
    setDragFrom(null);
  };

  const save = async () => {
    setSaving(true);
    try {
      await toastPromise(api.patch(`/api/admin/bus/routes/${route.id}`, { name, stops: stops.map((stop) => ({ name: stop.name.trim(), offsetMinutes: stop.offsetMinutes })), notes: notes.trim() || null, isActive: active }), {
        loading: "Saving route…",
        success: "Route saved. Public bus board and chatbot updated ✓",
      });
      await queryClient.invalidateQueries({ queryKey: ROUTES_KEY });
    } catch {
      // toast shown
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Route and stops" description="Drag the handle (or use the arrows) to reorder stops. Minutes are counted from the first stop.">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Route name" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
        </Field>
        <Switch className="self-end pb-2" checked={active} onCheckedChange={setActive} label="Active" description="Inactive routes are hidden publicly." />
      </div>
      <ol className="mt-4 space-y-2" aria-label="Stops in order">
        {stops.map((stop, index) => (
          <li
            key={index}
            draggable
            onDragStart={() => setDragFrom(index)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => onDrop(event, index)}
            onDragEnd={() => setDragFrom(null)}
            className={cn("flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-2/50 p-2", dragFrom === index && "opacity-50")}
          >
            <GripVertical className="size-4 shrink-0 cursor-grab text-fg-subtle" aria-hidden />
            <span className="w-6 shrink-0 text-center text-xs font-bold text-fg-subtle">{index + 1}</span>
            <Input aria-label={`Stop ${index + 1} name`} value={stop.name} onChange={(event) => setStops(stops.map((item, i) => (i === index ? { ...item, name: event.target.value } : item)))} maxLength={80} className="min-w-[9rem] flex-1 basis-40" />
            <Input aria-label={`Minutes from start for stop ${index + 1}`} type="number" min={0} max={300} value={stop.offsetMinutes} onChange={(event) => setStops(stops.map((item, i) => (i === index ? { ...item, offsetMinutes: Number(event.target.value) } : item)))} className="w-20 shrink-0" />
            <span className="hidden text-xs text-fg-subtle sm:inline">min</span>
            <Button type="button" size="icon-sm" variant="ghost" aria-label={`Move stop ${index + 1} up`} disabled={index === 0} onClick={() => move(index, index - 1)}>
              <ArrowUp />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" aria-label={`Move stop ${index + 1} down`} disabled={index === stops.length - 1} onClick={() => move(index, index + 1)}>
              <ArrowDown />
            </Button>
            <Button type="button" size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Remove stop ${index + 1}`} disabled={stops.length <= 2} onClick={() => setStops(stops.filter((_, i) => i !== index))}>
              <Trash2 />
            </Button>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" size="sm" onClick={() => setStops([...stops, { name: "", offsetMinutes: (stops[stops.length - 1]?.offsetMinutes ?? 0) + 5 }])} disabled={stops.length >= 30}>
          <Plus /> Add stop
        </Button>
        {problem && <p role="alert" className="text-sm font-medium text-danger">{problem}</p>}
      </div>
      <Field label="Notes" className="mt-4" hint="Shown on the public route page.">
        <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={1000} />
      </Field>
      <Button className="mt-4" onClick={() => void save()} loading={saving} disabled={Boolean(problem) || name.trim().length < 2}>
        <Save /> Save route
      </Button>
    </Panel>
  );
}

function TripRow({ trip, routeId }: { trip: Trip; routeId: string }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(trip);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(trip);

  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ROUTES_KEY }), queryClient.invalidateQueries({ queryKey: ["admin", "bus-next", routeId] })]);
  const save = () => {
    void toastPromise(api.patch(`/api/admin/bus/trips/${trip.id}`, { departureTime: draft.departureTime, direction: draft.direction, daysOfWeek: draft.daysOfWeek, isActive: draft.isActive }), { loading: "Saving trip…", success: "Trip saved. Public bus board updated ✓" })
      .then(refresh)
      .catch(() => undefined);
  };
  const remove = () => {
    void toastPromise(api.delete(`/api/admin/bus/trips/${trip.id}`), { loading: "Deleting trip…", success: "Trip deleted. Public bus board updated ✓" })
      .then(refresh)
      .catch(() => undefined);
  };
  const toggleDay = (day: number) => setDraft({ ...draft, daysOfWeek: draft.daysOfWeek.includes(day) ? draft.daysOfWeek.filter((d) => d !== day) : [...draft.daysOfWeek, day].sort() });

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2/40 p-3">
      <Input aria-label="Departure time" type="time" value={draft.departureTime} onChange={(event) => setDraft({ ...draft, departureTime: event.target.value })} className="w-32" />
      <Select aria-label="Direction" value={draft.direction} onChange={(event) => setDraft({ ...draft, direction: event.target.value as Direction })} className="w-40">
        {(Object.keys(DIRECTION_LABEL) as Direction[]).map((direction) => (
          <option key={direction} value={direction}>
            {DIRECTION_LABEL[direction]}
          </option>
        ))}
      </Select>
      <div role="group" aria-label="Days of the week" className="flex gap-1">
        {BUS_SERVICE_DAYS.map((day) => (
          <button
            key={day}
            type="button"
            aria-pressed={draft.daysOfWeek.includes(day)}
            onClick={() => toggleDay(day)}
            className={cn("h-9 w-10 rounded-lg border text-xs font-semibold transition", draft.daysOfWeek.includes(day) ? "border-primary bg-primary text-primary-fg" : "border-border bg-surface text-fg-muted hover:border-border-strong")}
          >
            {weekdayShort(day)}
          </button>
        ))}
      </div>
      <Switch checked={draft.isActive} onCheckedChange={(isActive) => setDraft({ ...draft, isActive })} label={<span className="text-xs">Active</span>} />
      <div className="ml-auto flex gap-1">
        <Button size="sm" onClick={save} disabled={!dirty || draft.daysOfWeek.length === 0}>
          Save
        </Button>
        <Button size="icon-sm" variant="ghost" className="hover:text-danger" aria-label={`Delete ${trip.departureTime} trip`} onClick={() => setConfirmDelete(true)}>
          <Trash2 />
        </Button>
      </div>
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this trip?" description={`The ${trip.departureTime} departure disappears from the public schedule.`} confirmLabel="Delete trip" destructive onConfirm={() => { setConfirmDelete(false); remove(); }} />
    </li>
  );
}

function TripsEditor({ route }: { route: Route }) {
  const queryClient = useQueryClient();
  const [adding, setAdding] = useState(false);
  const add = async () => {
    setAdding(true);
    try {
      await toastPromise(api.post(`/api/admin/bus/routes/${route.id}/trips`, { departureTime: "08:00", direction: "TO_CAMPUS", daysOfWeek: [...BUS_SERVICE_DAYS], isActive: true }), { loading: "Adding trip…", success: "Trip added at 08:00. Adjust the time and save. Public bus board updated ✓" });
      await queryClient.invalidateQueries({ queryKey: ROUTES_KEY });
    } catch {
      // toast shown
    } finally {
      setAdding(false);
    }
  };
  return (
    <Panel title="Trips" description={`Departure times at the first stop. Buses run ${describeWorkingDays()}; there is no service on ${describeOffDays()}.`} actions={<Button size="sm" variant="secondary" onClick={() => void add()} loading={adding}><Plus /> Add trip</Button>}>
      {route.trips.length === 0 ? (
        <EmptyState title="No trips yet" description="Add the first departure." />
      ) : (
        <ul className="space-y-2">
          {route.trips.map((trip) => (
            <TripRow key={`${trip.id}-${trip.departureTime}-${trip.direction}-${trip.daysOfWeek.join()}-${trip.isActive}`} trip={trip} routeId={route.id} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function NextBusPreview({ route }: { route: Route }) {
  const [stop, setStop] = useState("");
  const next = useQuery({
    queryKey: ["admin", "bus-next", route.id, stop],
    queryFn: () => api.get<{ departures: Departure[] }>("/api/bus/next", { query: { route: route.code, stop, limit: 4 } }),
    refetchInterval: 30_000,
  });
  return (
    <Panel title="Preview: next bus" description="What students see right now.">
      <Select aria-label="Preview stop" value={stop} onChange={(event) => setStop(event.target.value)} className="mb-3">
        <option value="">First stop</option>
        {route.stops.map((item) => (
          <option key={item.name} value={item.name}>
            {item.name}
          </option>
        ))}
      </Select>
      {next.isPending ? (
        <Skeleton className="h-24 rounded-xl" />
      ) : next.isError ? (
        <p className="text-sm text-fg-muted">{errorMessage(next.error)}</p>
      ) : next.data.departures.length === 0 ? (
        <p className="py-4 text-center text-sm text-fg-subtle">No upcoming departures this week.</p>
      ) : (
        <ul className="space-y-2">
          {next.data.departures.map((departure) => (
            <li key={`${departure.time}-${departure.dayOffset}-${departure.direction}`} className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
              <span>
                <span className="font-display text-lg font-bold tabular-nums">{departure.time}</span> <span className="text-fg-muted">{DIRECTION_LABEL[departure.direction]}</span>
              </span>
              <Badge tone="accent">{departure.minutesUntil < 1 ? "now" : departure.minutesUntil < 60 ? `in ${departure.minutesUntil} min` : departure.dayOffset > 0 ? `+${departure.dayOffset} day` : `in ${Math.round(departure.minutesUntil / 60)} h`}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function NewRouteDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try {
      const route = await toastPromise(api.post<Route>("/api/admin/bus/routes", { code, name, stops: [{ name: from, offsetMinutes: 0 }, { name: "City University", offsetMinutes: 30 }], isActive: true }), { loading: "Creating route…", success: "Route created. Add stops and trips next. Public bus board updated ✓" });
      onCreated(route.id);
      onClose();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog
      open
      onClose={onClose}
      title="New bus route"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void create()} loading={busy} disabled={!code.trim() || name.trim().length < 2 || from.trim().length < 2}>
            Create route
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Route code" required hint="Letters, digits and dashes, e.g. R1.">
          <Input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} maxLength={16} />
        </Field>
        <Field label="Route name" required>
          <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="Mirpur - City University" />
        </Field>
        <Field label="Starting stop" required hint="The last stop is City University; edit stops after creating.">
          <Input value={from} onChange={(event) => setFrom(event.target.value)} maxLength={80} />
        </Field>
      </div>
    </Dialog>
  );
}

export function BusAdmin() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Route | null>(null);
  const routes = useQuery({ queryKey: ROUTES_KEY, queryFn: () => api.get<Route[]>("/api/admin/bus/routes") });
  const selected = routes.data?.find((route) => route.id === selectedId) ?? routes.data?.[0] ?? null;

  const remove = (route: Route) => {
    void toastPromise(api.delete(`/api/admin/bus/routes/${route.id}`), { loading: "Deleting route…", success: `${route.code} deleted. Public bus board updated ✓` })
      .then(() => {
        setSelectedId(null);
        return queryClient.invalidateQueries({ queryKey: ROUTES_KEY });
      })
      .catch(() => undefined);
  };

  return (
    <AdminPage
      title="Bus routes"
      description="Edit routes, stop order and the weekly timetable. The public board and the chatbot read the same data."
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus /> New route
        </Button>
      }
    >
      {routes.isPending ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : routes.isError ? (
        <ErrorState error={routes.error} onRetry={() => void routes.refetch()} />
      ) : routes.data.length === 0 ? (
        <EmptyState title="No routes yet" icon={<Bus />} action={<Button onClick={() => setCreating(true)}>Create the first route</Button>} />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_1fr]">
          <nav aria-label="Bus routes">
            <ul className="space-y-2">
              {routes.data.map((route) => (
                <li key={route.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(route.id)}
                    aria-current={selected?.id === route.id ? "true" : undefined}
                    className={cn("w-full rounded-xl border p-3 text-left transition", selected?.id === route.id ? "border-primary bg-primary-soft" : "border-border bg-surface hover:border-border-strong")}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold">{route.code}</span>
                      {!route.isActive && <Badge>Hidden</Badge>}
                    </span>
                    <span className="block truncate text-sm text-fg-muted">{route.name}</span>
                    <span className="text-xs text-fg-subtle">
                      {route.stops.length} stops · {route.trips.length} trips
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          {selected && (
            <div className="min-w-0 space-y-6" key={selected.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold">
                  {selected.code} · {selected.name}
                </h2>
                <Button variant="ghost" className="hover:text-danger" onClick={() => setDeleting(selected)}>
                  <Trash2 /> Delete route
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[1.5fr_1fr]">
                <div className="min-w-0 space-y-6">
                  <StopsEditor route={selected} key={JSON.stringify(selected.stops) + selected.name} />
                  <TripsEditor route={selected} />
                </div>
                <NextBusPreview route={selected} />
              </div>
            </div>
          )}
        </div>
      )}
      {creating && <NewRouteDialog onClose={() => setCreating(false)} onCreated={(id) => { setSelectedId(id); void queryClient.invalidateQueries({ queryKey: ROUTES_KEY }); }} />}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={`Delete route ${deleting?.code ?? ""}?`}
        description="The route and its trips disappear from the public bus board and the chatbot."
        confirmLabel="Delete route"
        destructive
        onConfirm={() => {
          const target = deleting;
          setDeleting(null);
          if (target) remove(target);
        }}
      />
    </AdminPage>
  );
}
