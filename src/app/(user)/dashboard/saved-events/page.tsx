import type { Metadata } from "next";
import { SavedEvents } from "@/components/features/events/saved-events";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Saved events", description: "Events you bookmarked.", path: "/dashboard/saved-events", noIndex: true });

export default function SavedEventsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Saved events" description="Your shortlist - register when you are ready." />
      <SavedEvents />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
