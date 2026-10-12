import type { Metadata } from "next";
import { Suspense } from "react";
import { HelpdeskExplorer } from "@/components/features/helpdesk/helpdesk-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { ListSkeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Helpdesk & FAQ",
  description: "Answers to City University questions about exams, admission, bus timings, rules and fees - searchable, with an assistant that only answers from verified knowledge.",
  path: "/helpdesk",
  keywords: ["helpdesk"],
});

export default function HelpdeskPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Helpdesk", path: "/helpdesk" }])} />
      <PageHeader
        variant="hero"
        eyebrow="Smart helpdesk"
        title="How can we help?"
        description="Search verified answers about exams, admission, bus timings, rules and more."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Helpdesk" }]}
      />
      <div className="container-app py-8 sm:py-10">
        <Suspense fallback={<ListSkeleton count={5} media={false} className="grid-cols-1 sm:grid-cols-1 lg:grid-cols-1" />}>
          <HelpdeskExplorer />
        </Suspense>
      </div>
    </>
  );
}
