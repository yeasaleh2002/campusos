import type { Metadata } from "next";
import { Suspense } from "react";
import { ClubsExplorer } from "@/components/features/clubs/clubs-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { ListSkeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Clubs & societies",
  description: "Explore City University clubs - technology, debate, cultural, sports, social service and more. Follow a club to hear about its events first.",
  path: "/clubs",
  keywords: ["clubs", "events"],
});

export default function ClubsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Clubs", path: "/clubs" }])} />
      <PageHeader
        variant="hero"
        eyebrow="Find your people"
        title="Clubs & societies"
        description="From coding to debate to blood donation - pick a club, follow it, and never miss its next event."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Clubs" }]}
      />
      <div className="container-app py-8 sm:py-10">
        <Suspense fallback={<ListSkeleton count={6} media={false} />}>
          <ClubsExplorer />
        </Suspense>
      </div>
    </>
  );
}
