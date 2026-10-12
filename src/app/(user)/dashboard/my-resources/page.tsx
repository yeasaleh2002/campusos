import type { Metadata } from "next";
import { MyResources } from "@/components/features/resources/my-resources";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "My uploads", description: "Track the moderation status of your resources.", path: "/dashboard/my-resources", noIndex: true });

export default function MyResourcesPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="My uploads" description="See what is live, pending review, or needs a fix." />
      <MyResources />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
