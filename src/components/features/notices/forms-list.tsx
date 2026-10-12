"use client";

import { ClipboardList, ExternalLink, Timer } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListView } from "@/components/ui/list-view";
import { useCountdown } from "@/hooks/use-countdown";
import { useCursorList } from "@/hooks/use-cursor-list";
import { formatDateTime } from "@/lib/format";

interface FormRow {
  id: string;
  title: string;
  description: string | null;
  url: string;
  deadline: string | null;
  club: { id: string; name: string; slug: string } | null;
}

function Deadline({ deadline }: { deadline: string | null }) {
  const countdown = useCountdown(deadline, 30_000);
  if (!deadline) return <Badge tone="neutral">No deadline</Badge>;
  if (!countdown) return <Badge tone="neutral">{formatDateTime(deadline)}</Badge>;
  if (countdown.done) return <Badge tone="danger">Closed</Badge>;
  const urgent = countdown.days === 0;
  const text = countdown.days > 0 ? `${countdown.days}d ${countdown.hours}h left` : countdown.hours > 0 ? `${countdown.hours}h ${countdown.minutes}m left` : `${countdown.minutes}m left`;
  return (
    <Badge tone={urgent ? "danger" : countdown.days <= 3 ? "warning" : "success"}>
      <Timer /> {text}
    </Badge>
  );
}

/** Open forms (Google Forms etc.) with a live deadline countdown. */
export function FormsList() {
  const list = useCursorList<FormRow>(["forms"], "/api/forms", { limit: 12 });
  return (
    <ListView
      list={list}
      getKey={(form) => form.id}
      className="grid gap-5 md:grid-cols-2"
      media={false}
      renderItem={(form) => (
        <article className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-xs transition hover:border-border-strong hover:shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Deadline deadline={form.deadline} />
            {form.club && (
              <Link href={`/clubs/${form.club.slug}`} className="text-xs font-semibold text-fg-subtle hover:text-primary hover:underline">
                {form.club.name}
              </Link>
            )}
          </div>
          <h3 className="font-display text-lg font-semibold leading-snug">{form.title}</h3>
          {form.description && <p className="line-clamp-3 text-sm text-fg-muted">{form.description}</p>}
          {form.deadline && <p className="text-xs text-fg-subtle">Closes {formatDateTime(form.deadline)}</p>}
          <Button asChild variant="soft" className="mt-auto self-start">
            <a href={form.url} target="_blank" rel="noopener noreferrer">
              Open form <ExternalLink />
            </a>
          </Button>
        </article>
      )}
      empty={{ title: "No open forms", description: "When a club or office opens a form, it will show up here.", icon: <ClipboardList /> }}
    />
  );
}
