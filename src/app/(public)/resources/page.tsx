import { Upload } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ResourcesExplorer } from "@/components/features/resources/resources-explorer";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Notes, previous questions & lab manuals",
  description: "Search City University notes, previous year question papers and lab manuals by department, course and semester. Typo-tolerant search that understands CSE 2101, DBMS and more.",
  path: "/resources",
  keywords: ["resources"],
});

export default function ResourcesPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }])} />
      <PageHeader
        variant="hero"
        eyebrow="Resource hub"
        title="Notes, previous questions & lab manuals"
        description="Peer-shared and moderator-approved study material, searchable by course code, topic or semester."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Resources" }]}
        actions={
          <Button asChild variant="gradient">
            <Link href="/dashboard/resources/upload">
              <Upload /> Share a resource
            </Link>
          </Button>
        }
      />
      <div className="container-app py-8 sm:py-10">
        <Suspense fallback={<ListSkeleton count={6} media={false} />}>
          <ResourcesExplorer />
        </Suspense>
      </div>
    </>
  );
}
