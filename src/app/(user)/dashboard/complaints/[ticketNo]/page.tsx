import type { Metadata } from "next";
import { Suspense } from "react";
import { ComplaintDetail } from "@/components/features/complaints/complaint-detail";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Complaint ticket", description: "Status and timeline of your complaint.", path: "/dashboard/complaints", noIndex: true });

type Props = { params: Promise<{ ticketNo: string }> };

export default function ComplaintTicketPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
      <Ticket params={params} />
    </Suspense>
  );
}

async function Ticket({ params }: Props) {
  const { ticketNo } = await params;
  const decoded = decodeURIComponent(ticketNo);
  return (
    <div className="space-y-8">
      <PageHeader
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Complaints", href: "/dashboard/complaints" }, { label: decoded }]}
        title={`Ticket ${decoded}`}
        description="You will be notified in-app and by email whenever the status changes."
      />
      <ComplaintDetail ticketNo={decoded} />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
