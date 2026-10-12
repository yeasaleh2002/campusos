"use client";

import { useQuery } from "@tanstack/react-query";
import { HelpCircle, Link2, MessageCircleQuestion, ThumbsDown, ThumbsUp } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { openChatbot } from "@/components/shared/chatbot/chatbot-launcher";
import { Accordion } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Highlight } from "@/components/ui/highlight";
import { SearchBar } from "@/components/ui/search-bar";
import { ListSkeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { useCursorList } from "@/hooks/use-cursor-list";
import { useUrlFilters } from "@/hooks/use-url-filters";
import { api } from "@/lib/api-client";
import { KB_CATEGORY, labelOf } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
  sourceType: string;
  updatedAt: string;
}

interface CategoryCount {
  category: string;
  count: number;
}

const DEFAULTS = { q: "", category: "" };

function Answer({ entry, query }: { entry: Entry; query: string }) {
  const [vote, setVote] = useState<"up" | "down" | null>(null);
  const permalink = `/helpdesk/${entry.id}`;

  const rate = (next: "up" | "down") => {
    setVote(next);
    if (next === "up") toast.success("Glad it helped!");
    else toast("Sorry about that - try the assistant for a tailored answer.", { icon: "💬" });
  };

  return (
    <div className="space-y-4">
      <p className="whitespace-pre-line [overflow-wrap:anywhere]">
        <Highlight text={entry.answer} query={query} />
      </p>
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <span className="text-xs font-semibold text-fg-subtle">Was this helpful?</span>
        <Button size="sm" variant={vote === "up" ? "soft" : "ghost"} aria-pressed={vote === "up"} onClick={() => rate("up")}>
          <ThumbsUp /> Yes
        </Button>
        <Button size="sm" variant={vote === "down" ? "soft" : "ghost"} aria-pressed={vote === "down"} onClick={() => rate("down")}>
          <ThumbsDown /> No
        </Button>
        <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />
        <Button size="sm" variant="ghost" onClick={() => openChatbot(entry.question)}>
          <MessageCircleQuestion /> Ask the assistant
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            void navigator.clipboard
              .writeText(new URL(permalink, window.location.origin).toString())
              .then(() => toast.success("Link copied."))
              .catch(() => toast.error("Couldn't copy the link."));
          }}
        >
          <Link2 /> Copy link
        </Button>
      </div>
    </div>
  );
}

/** FAQ browser: category chips with counts, ranked search with highlighting, accordion answers. */
export function HelpdeskExplorer() {
  const { values, set } = useUrlFilters(DEFAULTS);
  const categories = useQuery({ queryKey: ["helpdesk", "categories"], queryFn: () => api.get<CategoryCount[]>("/api/helpdesk/categories"), staleTime: 10 * 60_000 });
  const query = useMemo(() => ({ q: values.q, category: values.category }), [values.q, values.category]);
  const list = useCursorList<Entry>(["helpdesk", "entries"], "/api/helpdesk/entries", { query, limit: 20 });
  const total = categories.data?.reduce((sum, row) => sum + row.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <SearchBar value={values.q} onSearch={(q) => set({ q })} placeholder="Ask anything: exam rules, bus timing, admission, fees…" label="Search the helpdesk" className="max-w-2xl" />

      <div role="radiogroup" aria-label="Category" className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
        {[{ category: "", count: total }, ...(categories.data ?? [])].map((row) => {
          const selected = values.category === row.category;
          return (
            <button
              key={row.category || "all"}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => set({ category: row.category })}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
                selected ? "border-primary bg-primary text-primary-fg shadow-sm" : "border-border bg-surface text-fg-muted hover:border-border-strong hover:text-fg",
              )}
            >
              {row.category ? labelOf(KB_CATEGORY, row.category).label : "All topics"}
              {row.count > 0 && <Badge tone={selected ? "glass" : "neutral"}>{row.count}</Badge>}
            </button>
          );
        })}
      </div>

      {list.isPending ? (
        <ListSkeleton count={5} media={false} className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1" />
      ) : list.isError ? (
        <ErrorState error={list.error} onRetry={() => void list.refetch()} />
      ) : list.items.length === 0 ? (
        <EmptyState
          title={values.q ? `No answer found for “${values.q}”` : "No entries in this topic yet"}
          description="Our assistant can look deeper - or send us a complaint so we can add the answer."
          icon={<HelpCircle />}
          action={
            <Button variant="gradient" onClick={() => openChatbot(values.q || undefined)}>
              <MessageCircleQuestion /> Ask the assistant
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <Accordion
            items={list.items.map((entry) => ({
              id: entry.id,
              title: (
                <span className="flex flex-col gap-1">
                  <span>
                    <Highlight text={entry.question} query={values.q} />
                  </span>
                  <span className="text-xs font-medium text-fg-subtle">{labelOf(KB_CATEGORY, entry.category).label}</span>
                </span>
              ),
              content: <Answer entry={entry} query={values.q} />,
            }))}
          />
          {list.hasNextPage && (
            <div className="flex justify-center">
              <Button variant="secondary" onClick={() => void list.fetchNextPage()} loading={list.isFetchingNextPage}>
                Show more answers
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-primary/20 bg-primary-soft/50 p-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-display text-lg font-semibold">Still stuck?</h2>
          <p className="text-sm text-fg-muted">The campus assistant answers from verified knowledge only - and tells you when it is not sure.</p>
        </div>
        <Button variant="gradient" onClick={() => openChatbot()}>
          <MessageCircleQuestion /> Ask the assistant
        </Button>
      </div>
    </div>
  );
}
