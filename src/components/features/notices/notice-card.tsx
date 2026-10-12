import { AlertTriangle, Ban, Paperclip, Pin } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Highlight } from "@/components/ui/highlight";
import { excerpt, formatRelative } from "@/lib/format";
import { NOTICE_CATEGORY, labelOf } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface NoticeCardData {
  id: string;
  title: string;
  body: string;
  category: string;
  pinned: boolean;
  expiresAt: string | Date | null;
  attachmentUrl: string | null;
  createdAt: string | Date;
  department: { code?: string; name?: string } | null;
  course: { code?: string; title?: string } | null;
}

/** Notice tile. Class cancellations and urgent notices are visually loud on purpose. */
export function NoticeCard({ notice, query }: { notice: NoticeCardData; query?: string }) {
  const category = labelOf(NOTICE_CATEGORY, notice.category);
  const cancelled = notice.category === "CLASS_CANCELLATION";
  const urgent = notice.category === "URGENT";
  const target = notice.course?.code ?? notice.department?.code;
  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-2xl border p-5 shadow-xs transition duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-within:ring-2 focus-within:ring-ring",
        cancelled ? "border-danger/40 bg-danger-soft/40" : urgent ? "border-warning/40 bg-warning-soft/40" : "border-border bg-surface hover:border-border-strong",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={category.tone}>
          {cancelled ? <Ban /> : urgent ? <AlertTriangle /> : null}
          {category.label}
        </Badge>
        {notice.pinned && (
          <Badge tone="primary">
            <Pin /> Pinned
          </Badge>
        )}
        {target && <Badge tone="outline">{target}</Badge>}
        {notice.attachmentUrl && (
          <Badge tone="neutral">
            <Paperclip /> Attachment
          </Badge>
        )}
      </div>
      <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
        <Link href={`/notices/${notice.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
          <Highlight text={notice.title} query={query} />
        </Link>
      </h3>
      <p className="line-clamp-3 text-sm text-fg-muted">{excerpt(notice.body, 220)}</p>
      <p className="mt-auto text-xs text-fg-subtle">{formatRelative(notice.createdAt)}</p>
    </article>
  );
}
