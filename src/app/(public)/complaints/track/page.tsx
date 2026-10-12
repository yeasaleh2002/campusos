import type { Metadata } from "next";
import { Suspense } from "react";
import { TicketLookup } from "@/components/features/complaints/ticket-lookup";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Track a complaint",
  description: "Check the status of your City University complaint with your ticket number.",
  path: "/complaints/track",
  keywords: ["complaints"],
});

export default function TrackComplaintPage() {
  return (
    <>
      <PageHeader
        variant="hero"
        eyebrow="Ticket status"
        title="Track a complaint"
        description="Signed in? You will see everything. Otherwise enter your ticket and the email you filed with."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Complaints", href: "/complaints/new" }, { label: "Track" }]}
      />
      <div className="container-app max-w-3xl py-8 sm:py-10">
        <Suspense fallback={<Skeleton className="h-40 rounded-2xl" />}>
          <TicketLookup />
        </Suspense>
      </div>
    </>
  );
}
