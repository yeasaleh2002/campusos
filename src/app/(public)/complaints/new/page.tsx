import type { Metadata } from "next";
import { ComplaintForm } from "@/components/features/complaints/complaint-form";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "File a complaint",
  description: "Report an academic, transport, facilities or administrative problem at City University. Get a ticket number and track progress - anonymous option available.",
  path: "/complaints/new",
  keywords: ["complaints"],
});

export default function NewComplaintPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Complaints", path: "/complaints/new" }])} />
      <PageHeader
        variant="hero"
        eyebrow="Your voice matters"
        title="File a complaint"
        description="Every complaint gets a ticket number and a visible status. Harassment reports are prioritised automatically."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Complaints" }]}
      />
      <div className="container-app py-8 sm:py-10">
        <ComplaintForm />
      </div>
    </>
  );
}
