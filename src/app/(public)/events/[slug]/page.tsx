import { CalendarDays, MapPin, Users } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventBannerFallback, EventCard } from "@/components/features/events/event-card";
import { EventPanel } from "@/components/features/events/event-panel";
import { SaveEventButton } from "@/components/features/events/save-event-button";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata, eventJsonLd } from "@/config/seo";
import { formatFullDate, formatTimeRange } from "@/lib/format";
import { EVENT_TYPE, labelOf } from "@/lib/labels";
import { hourBucket } from "@/lib/time";
import { getPublicEventBySlug, getPublicEvents } from "@/server/queries/event.queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) return buildMetadata({ title: "Event not found", description: "This event is no longer available.", path: `/events/${slug}`, noIndex: true });
  return buildMetadata({
    title: event.title,
    description: `${event.title} - ${formatFullDate(event.startAt)} at ${event.venue}. Organised by ${event.club.name} at City University. Register free with a QR ticket.`,
    path: `/events/${slug}`,
    keywords: ["events"],
    extraKeywords: [event.title, event.club.name, `${event.club.name} event`],
    image: event.bannerUrl ?? undefined,
    type: "article",
  });
}

export default function EventDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <EventDetail params={params} />
    </Suspense>
  );
}

function DetailSkeleton() {
  return (
    <div className="container-app space-y-6 py-10" aria-busy="true">
      <Skeleton className="h-6 w-64" />
      <Skeleton className="h-12 w-3/4" />
      <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
        <Skeleton className="aspect-[16/9] rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}

async function EventDetail({ params }: Props) {
  const { slug } = await params;
  const event = await getPublicEventBySlug(slug);
  if (!event) notFound();

  const type = labelOf(EVENT_TYPE, event.type);
  const startAt = event.startAt.toISOString();
  const endAt = event.endAt.toISOString();
  const panelData = {
    id: event.id,
    title: event.title,
    slug: event.slug,
    type: event.type,
    status: event.status,
    description: event.description,
    startAt,
    endAt,
    venue: event.venue,
    bannerUrl: event.bannerUrl,
    capacity: event.capacity,
    registrationCount: event.registrationCount,
    registrationDeadline: event.registrationDeadline?.toISOString() ?? null,
    spotsLeft: event.spotsLeft,
    club: event.club,
  };

  return (
    <>
      <JsonLd
        data={eventJsonLd({
          title: event.title,
          description: event.description,
          slug: event.slug,
          startAt,
          endAt,
          venue: event.venue,
          bannerUrl: event.bannerUrl,
          clubName: event.club.name,
          capacity: event.capacity,
          registeredCount: event.registrationCount,
          status: event.status,
        })}
      />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Events", path: "/events" }, { name: event.title, path: `/events/${event.slug}` }])} />

      <div className="container-app py-8 sm:py-10">
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Events", href: "/events" }, { label: event.title }]}
          title={event.title}
          eyebrow={
            <span className="inline-flex flex-wrap items-center gap-2 normal-case tracking-normal">
              <Badge tone={type.tone}>{type.label}</Badge>
              {event.status === "CANCELLED" && <Badge tone="danger">Cancelled</Badge>}
              {event.status === "COMPLETED" && <Badge tone="neutral">Ended</Badge>}
            </span>
          }
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="space-y-8">
            <div className="relative aspect-[16/9] overflow-hidden rounded-3xl bg-surface-2 shadow-md">
              {event.bannerUrl ? (
                <Image src={event.bannerUrl} alt={`${event.title} banner`} fill priority sizes="(max-width: 1024px) 100vw, 800px" className="object-cover" />
              ) : (
                <EventBannerFallback type={event.type} title={event.title} />
              )}
            </div>

            <dl className="grid gap-4 rounded-2xl border border-border bg-surface p-5 sm:grid-cols-3">
              <div className="flex items-start gap-3">
                <CalendarDays className="mt-0.5 size-5 text-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">When</dt>
                  <dd className="font-semibold">{formatFullDate(event.startAt)}</dd>
                  <dd className="text-sm text-fg-muted">{formatTimeRange(event.startAt, event.endAt)}</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-5 text-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Where</dt>
                  <dd className="font-semibold">{event.venue}</dd>
                  <dd className="text-sm text-fg-muted">City University</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Users className="mt-0.5 size-5 text-primary" aria-hidden />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Organiser</dt>
                  <dd>
                    <Link href={`/clubs/${event.club.slug}`} className="font-semibold hover:text-primary hover:underline">
                      {event.club.name}
                    </Link>
                  </dd>
                  <dd className="text-sm text-fg-muted">{event.registrationCount} going</dd>
                </div>
              </div>
            </dl>

            <section aria-labelledby="about-heading">
              <h2 id="about-heading" className="font-display text-h3 font-bold">
                About this event
              </h2>
              <div className="mt-3 space-y-4 whitespace-pre-line text-fg-muted [overflow-wrap:anywhere]">{event.description}</div>
            </section>
          </div>

          <EventPanel initial={panelData} />
        </div>

        <Suspense fallback={<Skeleton className="mt-12 h-72 rounded-2xl" />}>
          <RelatedEvents eventId={event.id} clubSlug={event.club.slug} clubName={event.club.name} />
        </Suspense>
      </div>
    </>
  );
}

async function RelatedEvents({ eventId, clubSlug, clubName }: { eventId: string; clubSlug: string; clubName: string }) {
  await connection();
  const page = await getPublicEvents({ when: "upcoming", clubSlug, limit: 4 }, hourBucket());
  const related = page.items.filter((item) => item.id !== eventId).slice(0, 3);
  if (related.length === 0) return null;
  return (
    <section aria-labelledby="related-heading" className="mt-14">
      <h2 id="related-heading" className="font-display text-h3 font-bold">
        More from {clubName}
      </h2>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {related.map((item) => (
          <li key={item.id}>
            <EventCard event={item} action={<SaveEventButton event={item} />} />
          </li>
        ))}
      </ul>
    </section>
  );
}
