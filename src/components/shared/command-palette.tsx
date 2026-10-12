"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bus, CalendarDays, CornerDownLeft, FileText, HelpCircle, Megaphone, PackageSearch, Search, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type KeyboardEvent, useMemo, useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { cn } from "@/lib/utils";
import { Dialog } from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { formatHitSubtitle, SEARCH_GROUPS, type SearchGroupKey, type SearchResponse } from "@/components/shared/search-types";

export const GROUP_ICONS: Record<SearchGroupKey, LucideIcon> = {
  events: CalendarDays,
  resources: FileText,
  notices: Megaphone,
  helpdesk: HelpCircle,
  lostFound: PackageSearch,
};

const QUICK_LINKS: Array<{ label: string; href: string; icon: LucideIcon }> = [
  { label: "Events this week", href: "/events?when=thisWeek", icon: CalendarDays },
  { label: "Next bus", href: "/bus", icon: Bus },
  { label: "Notes & previous questions", href: "/resources", icon: FileText },
  { label: "Latest notices", href: "/notices", icon: Megaphone },
  { label: "Helpdesk FAQ", href: "/helpdesk", icon: HelpCircle },
  { label: "Lost & Found", href: "/lost-found", icon: PackageSearch },
];

interface Row {
  key: string;
  label: string;
  hint?: string;
  href: string;
  icon: LucideIcon;
  group: string;
}

/** Ctrl/⌘+K palette: quick links when empty, grouped live results from /api/search. */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const debounced = useDebounce(query.trim(), 220);
  const enabled = debounced.length >= 2;

  const { data, isFetching, isError } = useQuery({
    queryKey: queryKeys.search(debounced),
    queryFn: ({ signal }) => api.get<SearchResponse>("/api/search", { query: { q: debounced, limit: 5 }, signal }),
    enabled: open && enabled,
    staleTime: 60_000,
  });

  const rows = useMemo<Row[]>(() => {
    if (!enabled) return QUICK_LINKS.map((link) => ({ key: link.href, label: link.label, href: link.href, icon: link.icon, group: "Jump to" }));
    if (!data) return [];
    const hits = SEARCH_GROUPS.flatMap(({ key, label }) =>
      data.results[key].map((hit) => ({ key: `${key}-${hit.id}`, label: hit.title, hint: formatHitSubtitle(key, hit.subtitle), href: hit.link, icon: GROUP_ICONS[key], group: label })),
    );
    return [...hits, { key: "all", label: `See all results for "${debounced}"`, href: `/search?q=${encodeURIComponent(debounced)}`, icon: Search, group: "More" }];
  }, [enabled, data, debounced]);

  const go = (href: string) => {
    onClose();
    setQuery("");
    router.push(href);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((i) => (rows.length ? (i + 1) % rows.length : 0));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((i) => (rows.length ? (i - 1 + rows.length) % rows.length : 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const row = rows[Math.min(active, rows.length - 1)];
      if (row) go(row.href);
      else if (query.trim().length >= 2) go(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const activeIndex = Math.min(active, Math.max(rows.length - 1, 0));
  const noMatches = enabled && !isFetching && data !== undefined && rows.length <= 1;

  return (
    <Dialog open={open} onClose={onClose} title="Search CampusOS" hideTitle className="max-w-2xl">
      <div className="-mx-5 -mt-4 border-b border-border px-5 sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          {isFetching ? <Spinner className="size-5 text-primary" label="Searching" /> : <Search className="size-5 text-fg-subtle" aria-hidden />}
          <input
            data-autofocus
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search events, notes, notices, FAQ, lost items…"
            className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-subtle"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={rows[activeIndex] ? `palette-${rows[activeIndex].key}` : undefined}
            aria-label="Search"
            autoComplete="off"
            enterKeyHint="search"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[0.7rem] font-semibold text-fg-subtle sm:inline">Esc</kbd>
        </div>
      </div>
      <div className="-mx-2 h-[min(60dvh,26rem)] overflow-y-auto pt-3 scrollbar-thin" aria-live="polite">
        {isError && <p className="px-3 py-6 text-center text-sm text-danger">Search is unavailable right now. Please try again.</p>}
        {noMatches && <p className="px-3 pb-4 pt-6 text-center text-sm text-fg-muted">No direct matches for &ldquo;{debounced}&rdquo;. Try a course code like CSE-2201.</p>}
        <ul id="palette-results" role="listbox" aria-label="Results">
          {rows.map((row, index) => {
            const Icon = row.icon;
            const showGroup = index === 0 || rows[index - 1]?.group !== row.group;
            const selected = index === activeIndex;
            return (
              <li key={row.key} role="presentation">
                {showGroup && <p className="px-3 pb-1.5 pt-3 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-subtle">{row.group}</p>}
                <div
                  id={`palette-${row.key}`}
                  role="option"
                  aria-selected={selected}
                  onMouseMove={() => setActive(index)}
                  onClick={() => go(row.href)}
                  className={cn("flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5", selected ? "bg-primary-soft text-primary-soft-fg" : "text-fg")}
                >
                  <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", selected ? "bg-surface/70" : "bg-surface-2")}>
                    <Icon className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{row.label}</span>
                    {row.hint && <span className="block truncate text-xs text-fg-subtle">{row.hint}</span>}
                  </span>
                  {selected ? <CornerDownLeft className="size-4 shrink-0 opacity-70" /> : <ArrowRight className="size-4 shrink-0 opacity-0" />}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Dialog>
  );
}
