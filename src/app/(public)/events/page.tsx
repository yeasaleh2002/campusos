import type { Metadata } from "next";
import { Suspense } from "react";
import { EventsExplorer } from "@/components/features/events/events-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { ListSkeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Events at City University",
  description: "Workshops, contests, seminars, cultural nights and club meetups at City University Bangladesh. Search, filter, register with a QR ticket and add to your calendar.",
  path: "/events",
  keywords: ["events", "clubs"],
});

export default function EventsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Events", path: "/events" }])} />
      <PageHeader
        variant="hero"
        eyebrow="What's on"
        title="Events at City University"
        description="Find workshops, contests, seminars and fests. Register in one tap and walk in with a QR ticket."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Events" }]}
      />
      <div className="container-app py-8 sm:py-10">
        <Suspense fallback={<ListSkeleton count={6} />}>
          <EventsExplorer />
        </Suspense>
      </div>
    </>
  );
}
