"use client";

import { PackageOpen, Plus } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { LostFoundCard, type LostFoundCardData } from "@/components/features/lost-found/lost-found-card";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { ListView } from "@/components/ui/list-view";
import { SearchBar } from "@/components/ui/search-bar";
import { Tabs } from "@/components/ui/tabs";
import { useCursorList } from "@/hooks/use-cursor-list";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { LOST_FOUND_CATEGORY, optionsOf } from "@/lib/labels";

const TABS = [
  { value: "", label: "All" },
  { value: "LOST", label: "Lost" },
  { value: "FOUND", label: "Found" },
] as const;

const CATEGORIES = [{ value: "", label: "Any category" }, ...optionsOf(LOST_FOUND_CATEGORY)];
const STATUSES = [
  { value: "OPEN", label: "Still open" },
  { value: "CLAIMED", label: "Claimed" },
  { value: "RESOLVED", label: "Returned" },
];
const DEFAULTS = { q: "", type: "", category: "", status: "OPEN" };

/** Public lost & found board with Lost/Found tabs, category + status filters and infinite scroll. */
export function LostFoundBoard() {
  const { values, set, reset, activeCount } = useUrlFilters(DEFAULTS);
  const query = useMemo(() => ({ ...values }), [values]);
  const list = useCursorList<LostFoundCardData>(["lost-found", "board"], "/api/lost-found", { query, limit: 12 });
  const tab = (TABS.some((item) => item.value === values.type) ? values.type : "") as (typeof TABS)[number]["value"];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs label="Lost or found" items={[...TABS]} value={tab} onValueChange={(type) => set({ type })} />
        <SearchBar value={values.q} onSearch={(q) => set({ q })} placeholder="Search by item, place or colour…" label="Search lost and found" className="lg:max-w-md lg:flex-1" />
      </div>
      <FilterChips label="Category" options={CATEGORIES} value={values.category} onChange={(category) => set({ category })} />
      <FilterChips label="Status" options={STATUSES} value={values.status} onChange={(status) => set({ status })} />
      <ListView
        list={list}
        getKey={(item) => item.id}
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3 3xl:grid-cols-4"
        renderItem={(item) => <LostFoundCard item={item} />}
        empty={{
          title: "Nothing posted here",
          description: values.status === "OPEN" ? "Lost something or found something? Post it - others are searching right now." : "No posts with this status yet.",
          icon: <PackageOpen />,
          action: (
            <div className="flex flex-wrap justify-center gap-3">
              {activeCount > 0 && (
                <Button variant="secondary" onClick={reset}>
                  Clear filters
                </Button>
              )}
              <Button asChild variant="gradient">
                <Link href="/lost-found/new">
                  <Plus /> Post an item
                </Link>
              </Button>
            </div>
          ),
        }}
      />
    </div>
  );
}
