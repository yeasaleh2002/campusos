import { AlertTriangle, Megaphone } from "lucide-react";
import Link from "next/link";
import { HomeEvents, HomeStats, NextBusPanel, RelativeTime } from "@/components/features/home/home-live";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { labelOf, NOTICE_CATEGORY } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { getBusRoutes } from "@/server/queries/campus.queries";
import { getHomeFeed } from "@/server/queries/home.queries";

/*
 * Landing sections. They read tag-cached data only (`getHomeFeed`, `getBusRoutes`) and never call `connection()`,
 * so the whole page is prerendered and served from the CDN with its data already in the HTML. The pieces that depend
 * on the current time (this week's events, "2 hours ago", the next bus) are finished by the client components in
 * `home-live.tsx`. There is no time-based revalidation: any mutation expires the tags and the next request rebuilds.
 */

export async function LiveStats() {
  const feed = await getHomeFeed();
  return <HomeStats stats={feed.stats} eventEnds={feed.eventEnds} />;
}

export function LiveStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-[8.5rem] rounded-2xl" />
      ))}
    </div>
  );
}

export async function WeekEvents() {
  const feed = await getHomeFeed();
  return <HomeEvents events={feed.events} />;
}

export function CardRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border border-border bg-surface">
          <Skeleton className="aspect-[16/9] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export async function NextBusWidget() {
  const routes = await getBusRoutes();
  return <NextBusPanel routes={routes} />;
}

export function PanelSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="glass space-y-3 rounded-3xl p-6">
      <Skeleton className="h-6 w-1/2" />
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 rounded-2xl" />
      ))}
    </div>
  );
}

export async function NoticesTicker() {
  const { notices } = await getHomeFeed();
  if (notices.length === 0) return null;
  const urgent = (category: string) => category === "CLASS_CANCELLATION" || category === "URGENT";

  const row = (hidden: boolean) =>
    notices.map((notice) => {
      const meta = labelOf(NOTICE_CATEGORY, notice.category);
      return (
        <li key={`${notice.id}-${hidden ? "b" : "a"}`} aria-hidden={hidden || undefined} className={cn("shrink-0", hidden && "motion-reduce:hidden")}>
          <Link
            href={`/notices/${notice.id}`}
            tabIndex={hidden ? -1 : undefined}
            className={cn("flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition hover:border-primary/40", urgent(notice.category) ? "border-danger/30 bg-danger-soft/60" : "border-border bg-surface")}
          >
            {urgent(notice.category) ? <AlertTriangle className="size-4 text-danger" aria-hidden /> : <Megaphone className="size-4 text-primary" aria-hidden />}
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="max-w-[22rem] truncate font-medium">{notice.title}</span>
            <RelativeTime value={notice.createdAt} className="text-xs text-fg-subtle" />
          </Link>
        </li>
      );
    });

  return (
    <div className="group relative overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_94%,transparent)]">
      <ul aria-label="Latest notices" className="flex w-max gap-3 animate-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:w-auto motion-reduce:animate-none motion-reduce:overflow-x-auto">
        {row(false)}
        {row(true)}
      </ul>
    </div>
  );
}
