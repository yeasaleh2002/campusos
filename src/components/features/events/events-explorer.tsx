"use client";

import { CalendarDays, LayoutGrid, List, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { CalendarView } from "@/components/features/events/calendar-view";
import { EventCard, type EventCardData } from "@/components/features/events/event-card";
import { SaveEventButton } from "@/components/features/events/save-event-button";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { ListView } from "@/components/ui/list-view";
import { SearchBar } from "@/components/ui/search-bar";
import { Tabs } from "@/components/ui/tabs";
import { useCursorList } from "@/hooks/use-cursor-list";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { EVENT_TYPE, optionsOf } from "@/lib/labels";
import { cn } from "@/lib/utils";

const WHEN_TABS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "thisWeek", label: "This week" },
  { value: "past", label: "Past" },
] as const;

const TYPE_OPTIONS = [{ value: "", label: "All types" }, ...optionsOf(EVENT_TYPE)];

const DEFAULTS = { q: "", when: "upcoming", type: "", view: "grid", club: "" };

type When = (typeof WHEN_TABS)[number]["value"];
type View = "grid" | "list" | "calendar";

const VIEWS: Array<{ value: View; label: string; icon: typeof LayoutGrid }> = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "list", label: "List", icon: List },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
];

/** Searchable, filterable event feed with grid / list / month-calendar views. State lives in the URL. */
export function EventsExplorer({ clubSlug, clubName }: { clubSlug?: string; clubName?: string }) {
  const { values, set, reset, activeCount } = useUrlFilters(DEFAULTS);
  const view = (VIEWS.some((v) => v.value === values.view) ? values.view : "grid") as View;
  const when = (WHEN_TABS.some((tab) => tab.value === values.when) ? values.when : "upcoming") as When;
  const club = clubSlug ?? (values.club || undefined);

  const query = useMemo(() => ({ when, type: values.type, q: values.q, clubSlug: club }), [when, values.type, values.q, club]);
  const list = useCursorList<EventCardData>(["events", "feed"], "/api/events", { query, enabled: view !== "calendar", limit: 12 });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <SearchBar value={values.q} onSearch={(q) => set({ q })} placeholder="Search events by title or venue…" label="Search events" className="lg:max-w-md lg:flex-1" />
        <div className="flex flex-wrap items-center gap-3">
          {view !== "calendar" && <Tabs label="Event timeframe" items={[...WHEN_TABS]} value={when} onValueChange={(value) => set({ when: value })} />}
          <div role="group" aria-label="Layout" className="flex rounded-xl border border-border bg-surface-2 p-1">
            {VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                aria-label={`${label} view`}
                onClick={() => set({ view: value })}
                className={cn("grid size-9 place-items-center rounded-lg transition", view === value ? "bg-surface text-primary shadow-sm" : "text-fg-muted hover:text-fg")}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <FilterChips label="Event type" options={TYPE_OPTIONS} value={values.type} onChange={(type) => set({ type })} />

      {(clubName || activeCount > 0) && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-fg-muted">
          {clubName && <span>Showing events by <strong className="text-fg">{clubName}</strong></span>}
          {activeCount > 0 && (
            <Button variant="ghost" size="sm" onClick={reset}>
              Clear filters
            </Button>
          )}
        </div>
      )}

      {view === "calendar" ? (
        <CalendarView clubSlug={club} type={values.type} />
      ) : (
        <ListView
          list={list}
          getKey={(event) => event.id}
          className={cn(view === "grid" ? "grid gap-5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4" : "space-y-4")}
          media={view === "grid"}
          renderItem={(event, index) => <EventCard event={event} layout={view === "list" ? "list" : "grid"} priority={index < 3} action={<SaveEventButton event={event} />} />}
          empty={{
            title: values.q ? `No events match “${values.q}”` : "No events here yet",
            description: when === "past" ? "Past events will appear here once they finish." : "Try another timeframe or event type - new events are added every week.",
            icon: <SearchX />,
            action:
              activeCount > 0 ? (
                <Button variant="secondary" onClick={reset}>
                  Reset filters
                </Button>
              ) : (
                <Button asChild variant="secondary">
                  <Link href="/clubs">Browse clubs</Link>
                </Button>
              ),
          }}
        />
      )}
    </div>
  );
}
