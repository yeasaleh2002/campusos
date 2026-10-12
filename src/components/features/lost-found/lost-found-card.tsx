import { MapPin, PackageSearch } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { formatRelative, formatDate } from "@/lib/format";
import { LOST_FOUND_CATEGORY, LOST_FOUND_STATUS, LOST_FOUND_TYPE, labelOf } from "@/lib/labels";
import { cn } from "@/lib/utils";

export interface LostFoundCardData {
  id: string;
  type: string;
  title: string;
  description: string;
  category: string;
  locationText: string;
  occurredAt: string | Date;
  imageUrls: string[];
  status: string;
  createdAt: string | Date;
}

/** Lost/found post tile (no reporter identity). Optional `footer` renders outside the link. */
export function LostFoundCard({ item, footer, className, score }: { item: LostFoundCardData; footer?: ReactNode; className?: string; score?: number }) {
  const type = labelOf(LOST_FOUND_TYPE, item.type);
  const category = labelOf(LOST_FOUND_CATEGORY, item.category);
  const status = labelOf(LOST_FOUND_STATUS, item.status);
  return (
    <article className={cn("group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-xs transition duration-300 hover:-translate-y-1 hover:border-border-strong hover:shadow-lg focus-within:ring-2 focus-within:ring-ring", className)}>
      <div className="relative aspect-[4/3] bg-surface-2">
        <ImageWithFallback
          src={item.imageUrls[0]}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 400px"
          className="transition duration-500 group-hover:scale-[1.04]"
          fallback={
            <div className="grid size-full place-items-center bg-gradient-to-br from-surface-2 to-surface-3 text-fg-subtle" aria-hidden>
              <PackageSearch className="size-12" />
            </div>
          }
        />
        <div className="absolute left-3 top-3 flex gap-2">
          <Badge tone={item.type === "LOST" ? "danger" : "success"} className="shadow-sm">
            {type.label}
          </Badge>
          {item.status !== "OPEN" && <Badge tone={status.tone}>{status.label}</Badge>}
        </div>
        {item.imageUrls.length > 1 && <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white">+{item.imageUrls.length - 1}</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4 sm:p-5">
        <Badge tone="outline" className="self-start">
          {category.label}
        </Badge>
        <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">
          <Link href={`/lost-found/${item.id}`} className="outline-none after:absolute after:inset-0 after:content-['']">
            <span className="line-clamp-2">{item.title}</span>
          </Link>
        </h3>
        <p className="line-clamp-2 text-sm text-fg-muted">{item.description}</p>
        <p className="mt-auto flex items-center gap-1.5 pt-2 text-xs text-fg-subtle">
          <MapPin className="size-3.5 shrink-0" aria-hidden />
          <span className="truncate">
            {item.locationText} · {item.type === "LOST" ? "lost" : "found"} {formatDate(item.occurredAt)}
          </span>
        </p>
        <p className="text-xs text-fg-subtle">Posted {formatRelative(item.createdAt)}</p>
        {score !== undefined && <p className="text-xs font-semibold text-primary">{Math.round(score * 100)}% match</p>}
        {footer && <div className="relative z-10 pt-2">{footer}</div>}
      </div>
    </article>
  );
}
