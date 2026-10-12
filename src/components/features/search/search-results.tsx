"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, FileText, HelpCircle, Megaphone, PackageSearch, SearchX, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Highlight } from "@/components/ui/highlight";
import { SearchBar } from "@/components/ui/search-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { SEARCH_GROUPS, type SearchGroupKey, type SearchResponse, formatHitSubtitle } from "@/components/shared/search-types";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";

const ICONS: Record<SearchGroupKey, LucideIcon> = {
  events: CalendarDays,
  resources: FileText,
  notices: Megaphone,
  helpdesk: HelpCircle,
  lostFound: PackageSearch,
};

/** Full-page grouped search (same API as the Ctrl+K palette). The query lives in the URL. */
export function SearchResults() {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get("q") ?? "").trim();
  const ready = q.length >= 2;
  const query = useQuery({ queryKey: queryKeys.search(`page:${q}`), enabled: ready, queryFn: () => api.get<SearchResponse>("/api/search", { query: { q, limit: 10 } }) });

  const total = query.data ? SEARCH_GROUPS.reduce((sum, group) => sum + query.data.results[group.key].length, 0) : 0;

  return (
    <div className="space-y-8">
      <SearchBar
        value={q}
        onSearch={(next) => router.replace(next ? `/search?q=${encodeURIComponent(next)}` : "/search", { scroll: false })}
        placeholder="Search events, notes, notices, answers, lost items…"
        label="Search CampusOS"
        className="max-w-2xl"
      />

      {!ready ? (
        <EmptyState title="What are you looking for?" description="Type at least two characters - try “dbms notes”, “bus”, or “blood donation”." icon={<SearchX />} />
      ) : query.isPending ? (
        <div className="space-y-4" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : total === 0 ? (
        <EmptyState title={`No results for “${q}”`} description="Check the spelling or try a broader word. The helpdesk assistant can also answer questions in plain language." icon={<SearchX />} />
      ) : (
        <div className="space-y-8" aria-live="polite">
          <p className="text-sm text-fg-muted">
            {total} result{total === 1 ? "" : "s"} for “{q}”
          </p>
          {SEARCH_GROUPS.map(({ key, label }) => {
            const hits = query.data.results[key];
            if (hits.length === 0) return null;
            const Icon = ICONS[key];
            return (
              <section key={key} aria-labelledby={`group-${key}`}>
                <h2 id={`group-${key}`} className="mb-3 flex items-center gap-2 font-display text-h3 font-bold">
                  <Icon className="size-5 text-primary" aria-hidden /> {label}
                </h2>
                <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
                  {hits.map((hit) => (
                    <li key={hit.id}>
                      <Link href={hit.link} className="block px-5 py-4 transition hover:bg-surface-2">
                        <span className="block font-semibold">
                          <Highlight text={hit.title} query={q} />
                        </span>
                        <span className="block text-sm text-fg-muted">{formatHitSubtitle(key, hit.subtitle)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
