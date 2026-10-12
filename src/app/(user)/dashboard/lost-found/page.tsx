import type { Metadata } from "next";
import { MyLostFound } from "@/components/features/lost-found/my-lost-found";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "My lost & found", description: "Posts you created and the claims on them.", path: "/dashboard/lost-found", noIndex: true });

export default function MyLostFoundPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="My lost & found" description="Review claims, mark items returned or reopen a post." />
      <MyLostFound />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
