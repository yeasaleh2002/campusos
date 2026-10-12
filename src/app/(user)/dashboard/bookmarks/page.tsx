import type { Metadata } from "next";
import { Bookmarks } from "@/components/features/resources/bookmarks";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Bookmarks", description: "Resources you saved.", path: "/dashboard/bookmarks", noIndex: true });

export default function BookmarksPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Bookmarks" description="Your saved notes and previous questions." />
      <Bookmarks />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
