import type { Metadata } from "next";
import { FormsList } from "@/components/features/notices/forms-list";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({
  title: "Open forms & deadlines",
  description: "Registration, volunteer and application forms at City University that are open right now, soonest deadline first.",
  path: "/forms",
  keywords: ["forms"],
});

export default function FormsPage() {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Forms", path: "/forms" }])} />
      <PageHeader
        variant="hero"
        eyebrow="Do not miss out"
        title="Open forms & deadlines"
        description="Everything you can still apply for, with a live countdown to each deadline."
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Forms" }]}
      />
      <div className="container-app py-8 sm:py-10">
        <FormsList />
      </div>
    </>
  );
}
