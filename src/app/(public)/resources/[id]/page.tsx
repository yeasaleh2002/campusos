import { CalendarDays, FileText, GraduationCap, UserRound } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ResourceActions } from "@/components/features/resources/resource-actions";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";
import { formatBytes, formatDate } from "@/lib/format";
import { RESOURCE_TYPE, labelOf } from "@/lib/labels";
import { getPublicResourceById } from "@/server/queries/resource.queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const resource = await getPublicResourceById(id);
  if (!resource) return buildMetadata({ title: "Resource not found", description: "This resource is not available.", path: `/resources/${id}`, noIndex: true });
  const type = labelOf(RESOURCE_TYPE, resource.type).label;
  return buildMetadata({
    title: `${resource.title} - ${type}`,
    description: `${resource.title} (${type}) for ${resource.course ? `${resource.course.code} ${resource.course.title}` : resource.department.name} at City University. Free PDF download.`,
    path: `/resources/${id}`,
    keywords: ["resources"],
    extraKeywords: [resource.title, ...(resource.course ? [resource.course.code, `${resource.course.code} ${type}`] : []), ...resource.tags],
  });
}

export default function ResourceDetailPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="container-app my-10 h-96 rounded-3xl" />}>
      <ResourceDetail params={params} />
    </Suspense>
  );
}

async function ResourceDetail({ params }: Props) {
  const { id } = await params;
  const resource = await getPublicResourceById(id);
  if (!resource) notFound();
  const type = labelOf(RESOURCE_TYPE, resource.type);

  const meta = [
    { icon: GraduationCap, label: "Course", value: resource.course ? `${resource.course.code} · ${resource.course.title}` : (resource.courseName ?? resource.department.name) },
    { icon: CalendarDays, label: "Semester / year", value: [resource.semester ? `Semester ${resource.semester}` : null, resource.year].filter(Boolean).join(" · ") || "Not specified" },
    { icon: FileText, label: "File", value: `PDF · ${formatBytes(resource.fileSize)}` },
    { icon: UserRound, label: "Shared by", value: resource.uploadedBy.name },
  ];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }, { name: resource.title, path: `/resources/${resource.id}` }])} />
      <div className="container-app py-8 sm:py-10">
        <PageHeader
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "Resources", href: "/resources" },
            { label: resource.department.code, href: `/resources?departmentId=${resource.department.id}` },
            { label: resource.title },
          ]}
          eyebrow={
            <span className="inline-flex items-center gap-2 normal-case tracking-normal">
              <Badge tone={type.tone}>{type.label}</Badge>
              <Badge tone="outline">{resource.department.code}</Badge>
            </span>
          }
          title={resource.title}
          description={resource.description ?? undefined}
        />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-8">
            <ResourceActions
              resource={{
                id: resource.id,
                title: resource.title,
                type: resource.type,
                downloadCount: resource.downloadCount,
                department: resource.department,
                course: resource.course ? { id: resource.course.id, code: resource.course.code, title: resource.course.title } : null,
              }}
            />
            {resource.tags.length > 0 && (
              <section aria-label="Tags">
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-fg-subtle">Tags</h2>
                <ul className="flex flex-wrap gap-2">
                  {resource.tags.map((tag) => (
                    <li key={tag}>
                      <Badge tone="neutral">#{tag}</Badge>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
          <dl className="space-y-4 rounded-2xl border border-border bg-surface p-5 lg:sticky lg:top-24 lg:self-start">
            {meta.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">{label}</dt>
                  <dd className="font-medium [overflow-wrap:anywhere]">{value}</dd>
                </div>
              </div>
            ))}
            <div className="border-t border-border pt-3 text-xs text-fg-subtle">Added {formatDate(resource.createdAt)}</div>
          </dl>
        </div>
      </div>
    </>
  );
}
