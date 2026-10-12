"use client";

import { Bookmark, BookmarkCheck, Download, FileText, GraduationCap } from "lucide-react";
import Link from "next/link";
import { type ResourceCardData, useToggleBookmark } from "@/components/features/resources/resource-hooks";
import { Badge } from "@/components/ui/badge";
import { Highlight } from "@/components/ui/highlight";
import { formatBytes, formatNumber } from "@/lib/format";
import { RESOURCE_TYPE, labelOf } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface ResourceCardProps {
  resource: ResourceCardData;
  /** Search text to highlight in the title and course. */
  query?: string;
  className?: string;
}

/** Resource tile: type badge, highlighted title, course meta, and a bookmark toggle outside the main link. */
export function ResourceCard({ resource, query, className }: ResourceCardProps) {
  const type = labelOf(RESOURCE_TYPE, resource.type);
  const { bookmarked, toggle, pending } = useToggleBookmark(resource);
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-xs transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg focus-within:ring-2 focus-within:ring-ring",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={type.tone}>{type.label}</Badge>
          <Badge tone="outline">{resource.department.code}</Badge>
          {resource.isSample && <Badge tone="neutral">Sample</Badge>}
        </div>
        <button
          type="button"
          onClick={toggle}
          disabled={pending}
          aria-pressed={bookmarked}
          aria-label={bookmarked ? `Remove bookmark: ${resource.title}` : `Bookmark: ${resource.title}`}
          className={cn("relative z-10 -m-1.5 grid size-9 shrink-0 place-items-center rounded-lg transition hover:bg-surface-2", bookmarked ? "text-primary" : "text-fg-subtle hover:text-fg")}
        >
          {bookmarked ? <BookmarkCheck className="size-5" /> : <Bookmark className="size-5" />}
        </button>
      </div>
      <h3 className="font-display text-base font-semibold leading-snug tracking-tight sm:text-lg">
        <Link href={`/resources/${resource.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
          <span className="line-clamp-2">
            <Highlight text={resource.title} query={query} />
          </span>
        </Link>
      </h3>
      {(resource.course || resource.courseName) && (
        <p className="flex items-center gap-1.5 text-sm text-fg-muted">
          <GraduationCap className="size-4 shrink-0 text-fg-subtle" aria-hidden />
          <span className="truncate">
            <Highlight text={resource.course ? `${resource.course.code} · ${resource.course.title}` : (resource.courseName ?? "")} query={query} />
          </span>
        </p>
      )}
      {resource.description && <p className="line-clamp-2 text-sm text-fg-subtle">{resource.description}</p>}
      <dl className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-fg-subtle">
        {(resource.semester || resource.year) && (
          <div>
            <dt className="sr-only">Semester and year</dt>
            <dd>{[resource.semester ? `Sem ${resource.semester}` : null, resource.year].filter(Boolean).join(" · ")}</dd>
          </div>
        )}
        <div className="flex items-center gap-1">
          <dt className="sr-only">Downloads</dt>
          <Download className="size-3.5" aria-hidden />
          <dd>{formatNumber(resource.downloadCount)}</dd>
        </div>
        <div className="flex items-center gap-1">
          <dt className="sr-only">File size</dt>
          <FileText className="size-3.5" aria-hidden />
          <dd>{formatBytes(resource.fileSize)}</dd>
        </div>
      </dl>
    </article>
  );
}
