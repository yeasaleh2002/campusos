import type { Metadata } from "next";
import { UploadForm } from "@/components/features/resources/upload-form";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Share a resource", description: "Upload notes, question papers or lab manuals for City University students.", path: "/dashboard/resources/upload", noIndex: true });

export default function UploadResourcePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Share a resource" description="Help the next batch: upload clear PDFs of notes, previous questions or lab manuals." />
      <UploadForm />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
