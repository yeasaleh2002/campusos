import { CalendarClock, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { ItemPanel } from "@/components/features/lost-found/item-panel";
import { LostFoundCard } from "@/components/features/lost-found/lost-found-card";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";
import { excerpt, formatDateTime } from "@/lib/format";
import { LOST_FOUND_CATEGORY, LOST_FOUND_STATUS, LOST_FOUND_TYPE, labelOf } from "@/lib/labels";
import { getLostFoundItem, getLostFoundMatches } from "@/server/queries/lost-found.queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = await getLostFoundItem(id);
  if (!item) return buildMetadata({ title: "Post not found", description: "This post is not available.", path: `/lost-found/${id}`, noIndex: true });
  return buildMetadata({
    title: `${labelOf(LOST_FOUND_TYPE, item.type).label}: ${item.title}`,
    description: excerpt(item.description, 155),
    path: `/lost-found/${id}`,
    keywords: ["lostFound"],
    image: item.imageUrls[0],
  });
}

export default function LostFoundItemPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="container-app my-10 h-96 rounded-3xl" />}>
      <ItemDetail params={params} />
    </Suspense>
  );
}

async function ItemDetail({ params }: Props) {
  const { id } = await params;
  const item = await getLostFoundItem(id);
  if (!item) notFound();
  const type = labelOf(LOST_FOUND_TYPE, item.type);
  const category = labelOf(LOST_FOUND_CATEGORY, item.category);
  const status = labelOf(LOST_FOUND_STATUS, item.status);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Lost & Found", path: "/lost-found" }, { name: item.title, path: `/lost-found/${item.id}` }])} />
      <div className="container-app py-8 sm:py-10">
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Lost & Found", href: "/lost-found" }, { label: item.title }]}
          eyebrow={
            <span className="inline-flex flex-wrap items-center gap-2 normal-case tracking-normal">
              <Badge tone={item.type === "LOST" ? "danger" : "success"}>{type.label}</Badge>
              <Badge tone="outline">{category.label}</Badge>
              <Badge tone={status.tone}>{status.label}</Badge>
            </span>
          }
          title={item.title}
        />
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-8">
            {item.imageUrls.length > 0 && (
              <ul className={`grid gap-3 ${item.imageUrls.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {item.imageUrls.map((url, index) => (
                  <li key={url} className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-surface-2">
                    <Image src={url} alt={`${item.title} - photo ${index + 1}`} fill priority={index === 0} sizes="(max-width: 1024px) 100vw, 480px" className="object-cover" />
                  </li>
                ))}
              </ul>
            )}
            <section aria-labelledby="details-heading" className="space-y-4">
              <h2 id="details-heading" className="font-display text-h3 font-bold">
                Details
              </h2>
              <p className="whitespace-pre-line text-fg-muted [overflow-wrap:anywhere]">{item.description}</p>
              <dl className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-2">
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 size-5 text-primary" aria-hidden />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Where</dt>
                    <dd className="font-semibold">{item.locationText}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CalendarClock className="mt-0.5 size-5 text-primary" aria-hidden />
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{item.type === "LOST" ? "Lost on" : "Found on"}</dt>
                    <dd className="font-semibold">{formatDateTime(item.occurredAt)}</dd>
                  </div>
                </div>
              </dl>
              <p className="text-xs text-fg-subtle">Posted by {item.reporter.name}. Contact details stay private until a claim is approved.</p>
            </section>
          </div>
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ItemPanel itemId={item.id} />
          </div>
        </div>

        <Suspense fallback={null}>
          <Matches id={item.id} lost={item.type === "LOST"} />
        </Suspense>
      </div>
    </>
  );
}

async function Matches({ id, lost }: { id: string; lost: boolean }) {
  // The cards print "Posted 2 hours ago", which needs the request time; keep that out of the prerendered shell.
  await connection();
  const matches = await getLostFoundMatches(id);
  if (matches.length === 0) return null;
  return (
    <section aria-labelledby="matches-heading" className="mt-14">
      <h2 id="matches-heading" className="font-display text-h3 font-bold">
        Possible {lost ? "found" : "lost"} matches
      </h2>
      <p className="mt-1 text-sm text-fg-muted">Ranked by category, wording and date proximity.</p>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {matches.map((match) => (
          <li key={match.id}>
            <LostFoundCard item={match} score={match.score} />
          </li>
        ))}
      </ul>
    </section>
  );
}
