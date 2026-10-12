import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Complaint ticket", description: "Open your complaint ticket.", path: "/complaints", noIndex: true });

type Props = { params: Promise<{ ticketNo: string }> };

/** Notification links point here; tickets live in the signed-in dashboard. */
export default function ComplaintRedirectPage({ params }: Props) {
  return (
    <Suspense fallback={null}>
      <Redirect params={params} />
    </Suspense>
  );
}

async function Redirect({ params }: Props): Promise<null> {
  const { ticketNo } = await params;
  redirect(`/dashboard/complaints/${encodeURIComponent(ticketNo)}`);
}
