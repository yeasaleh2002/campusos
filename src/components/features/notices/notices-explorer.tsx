"use client";

import { BellOff } from "lucide-react";
import { useMemo } from "react";
import { NoticeCard, type NoticeCardData } from "@/components/features/notices/notice-card";
import { Button } from "@/components/ui/button";
import { FilterChips } from "@/components/ui/filter-chips";
import { ListView } from "@/components/ui/list-view";
import { SearchBar } from "@/components/ui/search-bar";
import { useCursorList } from "@/hooks/use-cursor-list";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { NOTICE_CATEGORY, optionsOf } from "@/lib/labels";

const CATEGORIES = [{ value: "", label: "All notices" }, ...optionsOf(NOTICE_CATEGORY)];
const DEFAULTS = { q: "", category: "" };

/** Notice board: pinned first, filter by category, search, infinite scroll. */
export function NoticesExplorer() {
  const { values, set, reset, activeCount } = useUrlFilters(DEFAULTS);
  const query = useMemo(() => ({ q: values.q, category: values.category }), [values.q, values.category]);
  const list = useCursorList<NoticeCardData>(["notices", "board"], "/api/notices", { query, limit: 12 });

  return (
    <div className="space-y-6">
      <SearchBar value={values.q} onSearch={(q) => set({ q })} placeholder="Search notices…" label="Search notices" className="max-w-md" />
      <FilterChips label="Notice category" options={CATEGORIES} value={values.category} onChange={(category) => set({ category })} />
      <ListView
        list={list}
        getKey={(notice) => notice.id}
        className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3"
        media={false}
        renderItem={(notice) => <NoticeCard notice={notice} query={values.q} />}
        empty={{
          title: "No notices right now",
          description: "You are all caught up. New notices appear here the moment they are published.",
          icon: <BellOff />,
          action: activeCount ? (
            <Button variant="secondary" onClick={reset}>
              Clear filters
            </Button>
          ) : undefined,
        }}
      />
    </div>
  );
}
