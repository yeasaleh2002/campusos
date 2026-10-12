import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LostFoundBoard } from "@/components/features/lost-found/lost-found-board";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Lost & Found",
  description: "Lost your ID card, wallet or laptop charger at City University? Search found items or post what you lost - with smart matching and safe claims.",
  path: "/lost-found",
  keywords: ["lostFound"],
});

export default function LostFoundPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Lost & Found", path: "/lost-found" }])} />
      <PageHeader
        variant="hero"
        eyebrow="Campus lost & found"
        title="Lost something? Found something?"
        description="Post it, we look for matches, and owners claim with proof. Contact details are never public."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Lost & Found" }]}
        actions={
          <Button asChild variant="gradient">
            <Link href="/lost-found/new">
              <Plus /> Post an item
            </Link>
          </Button>
        }
      />
      <div className="container-app py-8 sm:py-10">
        <Suspense fallback={<ListSkeleton count={6} />}>
          <LostFoundBoard />
        </Suspense>
      </div>
    </>
  );
}
