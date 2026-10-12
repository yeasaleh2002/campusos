import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { EventCard } from "@/components/features/events/event-card";
import { SaveEventButton } from "@/components/features/events/save-event-button";
import { FollowButton } from "@/components/features/follow/follow-button";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";
import { CLUB_CATEGORY, labelOf } from "@/lib/labels";
import { hourBucket } from "@/lib/time";
import { getPublicClubBySlug } from "@/server/queries/club.queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  // Metadata only needs the static club fields; the event list is rendered live below.
  const club = await getPublicClubBySlug(slug, "1970-01-01T00:00:00.000Z");
  if (!club) return buildMetadata({ title: "Club not found", description: "This club is no longer active.", path: `/clubs/${slug}`, noIndex: true });
  return buildMetadata({
    title: club.name,
    description: club.description.slice(0, 155),
    path: `/clubs/${slug}`,
    keywords: ["clubs", "events"],
    extraKeywords: [club.name, `${club.name} City University`],
    image: club.coverUrl ?? club.logoUrl ?? undefined,
  });
}

export default function ClubDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="container-app my-10 h-96 rounded-3xl" />}>
      <ClubDetail params={params} />
    </Suspense>
  );
}

async function ClubDetail({ params }: Props) {
  const { slug } = await params;
  await connection();
  const club = await getPublicClubBySlug(slug, hourBucket());
  if (!club) notFound();
  const category = labelOf(CLUB_CATEGORY, club.category);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Clubs", path: "/clubs" }, { name: club.name, path: `/clubs/${club.slug}` }])} />
      <div className="relative isolate overflow-hidden border-b border-border">
        {club.coverUrl ? (
          <Image src={club.coverUrl} alt="" fill priority sizes="100vw" className="-z-10 object-cover opacity-30" />
        ) : (
          <div aria-hidden className="bg-mesh absolute inset-0 -z-10 opacity-70" />
        )}
        <div className="container-app py-10 sm:py-14">
          <PageHeader
            breadcrumbs={[{ label: "Home", href: "/" }, { label: "Clubs", href: "/clubs" }, { label: club.name }]}
            eyebrow={<Badge tone={category.tone}>{category.label}</Badge>}
            title={
              <span className="flex items-center gap-4">
                <Avatar name={club.name} src={club.logoUrl} size="xl" className="hidden sm:inline-flex" />
                {club.name}
              </span>
            }
            description={club.description}
            actions={
              <>
                <FollowButton targetType="CLUB" targetId={club.id} name={club.name} size="md" />
                <Button asChild variant="secondary">
                  <Link href={`/events?club=${club.slug}`}>All events</Link>
                </Button>
              </>
            }
          />
          <p className="mt-4 text-sm text-fg-muted">{club.memberCount.toLocaleString("en-US")} followers</p>
        </div>
      </div>

      <section className="container-app py-10" aria-labelledby="club-events">
        <div className="flex items-end justify-between gap-4">
          <h2 id="club-events" className="font-display text-h2 font-bold">
            Upcoming events
          </h2>
          <Link href={`/events?club=${club.slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
            See all <ArrowRight className="size-4" />
          </Link>
        </div>
        {club.upcomingEvents.length === 0 ? (
          <EmptyState className="mt-6" title="No upcoming events" description="Follow the club to be notified when something is announced." />
        ) : (
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {club.upcomingEvents.map((event) => (
              <li key={event.id}>
                <EventCard event={event} action={<SaveEventButton event={event} />} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
