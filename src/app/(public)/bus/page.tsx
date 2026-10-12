import type { Metadata } from "next";
import { Suspense } from "react";
import { BusBoard } from "@/components/features/bus/bus-board";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { ListSkeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Bus schedule & routes",
  description: "City University bus routes, stops and live next-bus countdowns in Dhaka time. Find the next bus from your stop to campus and back.",
  path: "/bus",
  keywords: ["bus"],
});

export default function BusPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Bus", path: "/bus" }])} />
      <PageHeader
        variant="hero"
        eyebrow="Campus transport"
        title="Bus schedule & routes"
        description="Never miss the campus bus again - pick your stop and see the next departures counting down live."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Bus" }]}
      />
      <div className="container-app py-8 sm:py-10">
        <Suspense fallback={<ListSkeleton count={4} media={false} />}>
          <BusBoard />
        </Suspense>
      </div>
    </>
  );
}
