import type { Metadata } from "next";
import { PostItemForm } from "@/components/features/lost-found/post-item-form";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Post a lost or found item", description: "Report a lost or found item on the City University campus.", path: "/lost-found/new", noIndex: true });

export default function NewLostFoundPage() {
  return (
    <div className="container-app space-y-8 py-8 sm:py-10">
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Lost & Found", href: "/lost-found" }, { label: "Post an item" }]}
        title="Post an item"
        description="Clear photos and specific details help the right person find it faster."
      />
      <PostItemForm />
    </div>
  );
}
