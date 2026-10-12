"use client";

import { UsersRound } from "lucide-react";
import { useMemo } from "react";
import { ClubCard, type ClubCardData } from "@/components/features/clubs/club-card";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { ListView } from "@/components/ui/list-view";
import { SearchBar } from "@/components/ui/search-bar";
import { useCursorList } from "@/hooks/use-cursor-list";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { CLUB_CATEGORY, optionsOf } from "@/lib/labels";

const CATEGORIES = [{ value: "", label: "All clubs" }, ...optionsOf(CLUB_CATEGORY)];
const DEFAULTS = { q: "", category: "" };

/** Club directory with search + category filter and infinite scroll. */
export function ClubsExplorer() {
  const { values, set, reset, activeCount } = useUrlFilters(DEFAULTS);
  const query = useMemo(() => ({ q: values.q, category: values.category }), [values.q, values.category]);
  const list = useCursorList<ClubCardData>(["clubs", "directory"], "/api/clubs", { query, limit: 12 });

  return (
    <div className="space-y-6">
      <SearchBar value={values.q} onSearch={(q) => set({ q })} placeholder="Search clubs…" label="Search clubs" className="max-w-md" />
      <FilterChips label="Club category" options={CATEGORIES} value={values.category} onChange={(category) => set({ category })} />
      <ListView
        list={list}
        getKey={(club) => club.id}
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4"
        media={false}
        renderItem={(club) => <ClubCard club={club} />}
        empty={{
          title: "No clubs found",
          description: "Try a different category or search term.",
          icon: <UsersRound />,
          action: activeCount ? (
            <Button variant="secondary" onClick={reset}>
              Reset filters
            </Button>
          ) : undefined,
        }}
      />
    </div>
  );
}
