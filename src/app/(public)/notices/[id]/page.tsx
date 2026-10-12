import { Ban, Download } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { ShareButton } from "@/components/shared/share-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata } from "@/config/seo";
import { excerpt, formatDateTime } from "@/lib/format";
import { NOTICE_CATEGORY, labelOf } from "@/lib/labels";
import { getNotice } from "@/server/queries/campus.queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const notice = await getNotice(id);
  if (!notice) return buildMetadata({ title: "Notice not found", description: "This notice is not available.", path: `/notices/${id}`, noIndex: true });
  return buildMetadata({ title: notice.title, description: excerpt(notice.body, 155), path: `/notices/${id}`, keywords: ["notices"], extraKeywords: [notice.title], type: "article" });
}

export default function NoticePage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="container-app my-10 h-72 rounded-3xl" />}>
      <NoticeDetail params={params} />
    </Suspense>
  );
}

async function NoticeDetail({ params }: Props) {
  const { id } = await params;
  const notice = await getNotice(id);
  if (!notice) notFound();
  const category = labelOf(NOTICE_CATEGORY, notice.category);
  const cancelled = notice.category === "CLASS_CANCELLATION";

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Notices", path: "/notices" }, { name: notice.title, path: `/notices/${notice.id}` }])} />
      <div className="container-app max-w-3xl py-8 sm:py-12">
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Notices", href: "/notices" }, { label: category.label }]}
          eyebrow={
            <span className="inline-flex flex-wrap items-center gap-2 normal-case tracking-normal">
              <Badge tone={category.tone}>{category.label}</Badge>
              {notice.department && <Badge tone="outline">{notice.department.code}</Badge>}
              {notice.course && <Badge tone="outline">{notice.course.code}</Badge>}
            </span>
          }
          title={notice.title}
          description={`Published ${formatDateTime(notice.createdAt)}${notice.expiresAt ? ` · valid until ${formatDateTime(notice.expiresAt)}` : ""}`}
        />
        {cancelled && (
          <p role="alert" className="mt-6 flex items-center gap-3 rounded-2xl border border-danger/40 bg-danger-soft px-4 py-3 font-semibold text-danger">
            <Ban className="size-5 shrink-0" /> Class cancelled - please read the details below.
          </p>
        )}
        <div className="mt-6 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <p className="whitespace-pre-line text-lg leading-relaxed [overflow-wrap:anywhere]">{notice.body}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {notice.attachmentUrl && (
            <Button asChild variant="gradient">
              <a href={notice.attachmentUrl} target="_blank" rel="noopener noreferrer">
                <Download /> Download attachment
              </a>
            </Button>
          )}
          <ShareButton title={notice.title} />
          <Button asChild variant="secondary">
            <Link href="/notices">All notices</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
