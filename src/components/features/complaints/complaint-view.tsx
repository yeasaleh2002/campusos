"use client";

import { CheckCircle2, CircleDot, Eye, EyeOff, Hourglass, XCircle } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Timeline } from "@/components/ui/timeline";
import { formatDateTime } from "@/lib/format";
import { COMPLAINT_CATEGORY, COMPLAINT_PRIORITY, COMPLAINT_STATUS, labelOf } from "@/lib/labels";

export interface TrackedComplaint {
  view: "owner" | "limited";
  ticketNo: string;
  category: string;
  subject?: string;
  description?: string;
  attachmentUrls?: string[];
  isAnonymous?: boolean;
  status: string;
  priority?: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: Array<{ status: string; note?: string | null; createdAt: string }>;
}

const STATUS_ICON = {
  RECEIVED: <CircleDot />,
  IN_REVIEW: <Hourglass />,
  RESOLVED: <CheckCircle2 />,
  REJECTED: <XCircle />,
} as const;

const STATUS_TONE = { RECEIVED: "primary", IN_REVIEW: "warning", RESOLVED: "success", REJECTED: "neutral" } as const;

/** Ticket summary + public status timeline. Owner view includes the full text; email view is status-only. */
export function ComplaintView({ complaint }: { complaint: TrackedComplaint }) {
  const status = labelOf(COMPLAINT_STATUS, complaint.status);
  const category = labelOf(COMPLAINT_CATEGORY, complaint.category);
  const priority = complaint.priority ? labelOf(COMPLAINT_PRIORITY, complaint.priority) : null;

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="outline" className="font-mono">
            {complaint.ticketNo}
          </Badge>
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone={category.tone}>{category.label}</Badge>
          {priority && <Badge tone={priority.tone}>{priority.label} priority</Badge>}
          {complaint.isAnonymous !== undefined && (
            <Badge tone="neutral">
              {complaint.isAnonymous ? <EyeOff /> : <Eye />} {complaint.isAnonymous ? "Anonymous" : "Named"}
            </Badge>
          )}
        </div>
        {complaint.subject && <h2 className="mt-4 font-display text-h3 font-bold [overflow-wrap:anywhere]">{complaint.subject}</h2>}
        {complaint.description && <p className="mt-3 whitespace-pre-line text-fg-muted [overflow-wrap:anywhere]">{complaint.description}</p>}
        {complaint.attachmentUrls && complaint.attachmentUrls.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {complaint.attachmentUrls.map((url, index) => (
              <li key={url} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                <Image src={url} alt={`Attachment ${index + 1}`} fill sizes="160px" className="object-cover" />
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-fg-subtle">
          Filed {formatDateTime(complaint.createdAt)}
          {complaint.resolvedAt && ` · closed ${formatDateTime(complaint.resolvedAt)}`}
        </p>
      </div>

      <section aria-labelledby="timeline-heading">
        <h2 id="timeline-heading" className="mb-5 font-display text-h3 font-bold">
          Progress
        </h2>
        <Timeline
          items={complaint.timeline.map((update, index) => ({
            id: `${update.createdAt}-${index}`,
            title: labelOf(COMPLAINT_STATUS, update.status).label,
            description: update.note ?? undefined,
            meta: formatDateTime(update.createdAt),
            tone: STATUS_TONE[update.status as keyof typeof STATUS_TONE] ?? "neutral",
            icon: STATUS_ICON[update.status as keyof typeof STATUS_ICON],
          }))}
        />
      </section>
    </div>
  );
}
