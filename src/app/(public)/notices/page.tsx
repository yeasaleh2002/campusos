import type { Metadata } from "next";
import { Suspense } from "react";
import { NoticesExplorer } from "@/components/features/notices/notices-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { ListSkeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Notices & class cancellations",
  description: "Official City University notices - class cancellations, exam schedules, urgent alerts and form deadlines, pinned and searchable.",
  path: "/notices",
  keywords: ["notices"],
});

export default function NoticesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Notices", path: "/notices" }])} />
      <PageHeader
        variant="hero"
        eyebrow="Official updates"
        title="Notices & class cancellations"
        description="Pinned and urgent notices first. Class cancellations are highlighted so you never travel for nothing."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Notices" }]}
      />
      <div className="container-app py-8 sm:py-10">
        <Suspense fallback={<ListSkeleton count={6} media={false} />}>
          <NoticesExplorer />
        </Suspense>
      </div>
    </>
  );
}
