import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchResults } from "@/components/features/search/search-results";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Search CampusOS",
  description: "Search City University events, notes, notices, helpdesk answers and lost items in one place.",
  path: "/search",
  keywords: ["search"],
  noIndex: true,
});

export default function SearchPage() {
  return (
    <>
      <PageHeader variant="hero" title="Search" description="One search across events, resources, notices, helpdesk and lost & found." breadcrumbs={[{ label: "Home", href: "/" }, { label: "Search" }]} />
      <div className="container-app py-8 sm:py-10">
        <Suspense fallback={<Skeleton className="h-64 rounded-2xl" />}>
          <SearchResults />
        </Suspense>
      </div>
    </>
  );
}
