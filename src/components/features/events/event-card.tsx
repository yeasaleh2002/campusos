import { CalendarDays, MapPin, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { isCampusOpen } from "@/config/campus-calendar";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { dateChip, formatTime, formatWeekdayDate } from "@/lib/format";
import { EVENT_TYPE, labelOf } from "@/lib/labels";
import { cn } from "@/lib/utils";

type DateLike = Date | string;

/** Works with both server rows (Date) and API JSON (string). */
export interface EventCardData {
  id: string;
  title: string;
  slug: string;
  type: string;
  status: string;
  startAt: DateLike;
  endAt: DateLike;
  venue: string;
  bannerUrl: string | null;
  capacity: number | null;
  registrationCount: number;
  spotsLeft: number | null;
  club: { name: string; slug: string; logoUrl: string | null };
}

/** Gradient placeholder that varies by event type (no image request). */
export function EventBannerFallback({ type, title, className }: { type: string; title: string; className?: string }) {
  const gradients: Record<string, string> = {
    WORKSHOP: "from-indigo-500 via-violet-500 to-fuchsia-500",
    CONTEST: "from-amber-500 via-orange-500 to-rose-500",
    SEMINAR: "from-sky-500 via-indigo-500 to-violet-600",
    CULTURAL: "from-emerald-500 via-teal-500 to-cyan-500",
    SPORTS: "from-lime-500 via-emerald-500 to-teal-600",
    MEETUP: "from-slate-500 via-indigo-500 to-slate-700",
  };
  return (
    <div className={cn("relative grid size-full place-items-center overflow-hidden bg-gradient-to-br text-white", gradients[type] ?? "from-indigo-600 to-emerald-500", className)} aria-hidden>
      <div className="bg-grid absolute inset-0 opacity-30" />
      <span className="relative px-6 text-center font-display text-xl font-bold leading-tight opacity-90 line-clamp-2">{title}</span>
    </div>
  );
}

function SeatsBadge({ capacity, spotsLeft, status }: Pick<EventCardData, "capacity" | "spotsLeft" | "status">) {
  if (status === "CANCELLED") return <Badge tone="danger">Cancelled</Badge>;
  if (status === "COMPLETED") return <Badge tone="neutral">Ended</Badge>;
  if (capacity === null || spotsLeft === null) return <Badge tone="glass">Open entry</Badge>;
  if (spotsLeft <= 0) return <Badge tone="danger">Full</Badge>;
  if (spotsLeft <= Math.max(5, capacity * 0.1)) return <Badge tone="warning">{spotsLeft} seats left</Badge>;
  return <Badge tone="glass">{spotsLeft} seats left</Badge>;
}

interface EventCardProps {
  event: EventCardData;
  /** Footer action (e.g. a register/save button) - rendered outside the main link. */
  action?: ReactNode;
  priority?: boolean;
  className?: string;
  layout?: "grid" | "list";
}

/** Event card: banner, club badge, date chip, venue, seats left. Whole card is one link. */
export function EventCard({ event, action, priority, className, layout = "grid" }: EventCardProps) {
  const chip = dateChip(event.startAt);
  // Weekly rule only: cards are cached pages and do not know about special closures.
  const offDay = !isCampusOpen(new Date(event.startAt));
  const type = labelOf(EVENT_TYPE, event.type);
  const list = layout === "list";
  return (
    <article
      className={cn(
        "group relative flex overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg focus-within:ring-2 focus-within:ring-ring",
        list ? "flex-col sm:flex-row" : "h-full flex-col",
        className,
      )}
    >
      <div className={cn("relative overflow-hidden bg-surface-2", list ? "aspect-[16/9] sm:aspect-auto sm:w-64 sm:shrink-0" : "aspect-[16/9]")}>
        <ImageWithFallback
          src={event.bannerUrl}
          alt=""
          fill
          priority={priority}
          sizes={list ? "(max-width: 640px) 100vw, 256px" : "(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px"}
          className="transition duration-500 group-hover:scale-[1.04]"
          fallback={<EventBannerFallback type={event.type} title={event.title} />}
        />
        <div className="absolute left-3 top-3 flex flex-col items-center rounded-xl bg-surface/95 px-2.5 py-1.5 text-center shadow-md backdrop-blur" aria-hidden>
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-primary">{chip.month}</span>
          <span className="font-display text-xl font-bold leading-none">{chip.day}</span>
        </div>
        <div className="absolute right-3 top-3">
          <SeatsBadge capacity={event.capacity} spotsLeft={event.spotsLeft} status={event.status} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={type.tone}>{type.label}</Badge>
          <span className="truncate text-xs font-medium text-fg-subtle">{event.club.name}</span>
        </div>
        <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
          <Link href={`/events/${event.slug}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            <span className="line-clamp-2">{event.title}</span>
          </Link>
        </h3>
        <dl className="mt-auto space-y-1.5 text-sm text-fg-muted">
          <div className="flex items-center gap-2">
            <dt className="sr-only">When</dt>
            <CalendarDays className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            <dd className="truncate">
              {formatWeekdayDate(event.startAt)} · {formatTime(event.startAt)}
              {offDay && <span className="ml-2 rounded-md bg-surface-2 px-1.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-fg-subtle">Campus off day</span>}
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Where</dt>
            <MapPin className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            <dd className="truncate">{event.venue}</dd>
          </div>
          <div className="flex items-center gap-2">
            <dt className="sr-only">Registered</dt>
            <Users className="size-4 shrink-0 text-fg-subtle" aria-hidden />
            <dd>{event.registrationCount.toLocaleString("en-US")} going</dd>
          </div>
        </dl>
        {action && <div className="relative z-10 pt-1">{action}</div>}
      </div>
    </article>
  );
}
