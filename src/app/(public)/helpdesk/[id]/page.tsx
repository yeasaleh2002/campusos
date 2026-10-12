import { MessageCircleQuestion } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AskAssistantButton } from "@/components/features/home/ask-assistant-button";
import { PageHeader } from "@/components/layout/page-header";
import { JsonLd } from "@/components/shared/json-ld";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { breadcrumbJsonLd, buildMetadata, faqJsonLd } from "@/config/seo";
import { formatDate } from "@/lib/format";
import { KB_CATEGORY, labelOf } from "@/lib/labels";
import { getHelpdeskEntry } from "@/server/queries/helpdesk.queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const entry = await getHelpdeskEntry(id);
  if (!entry) return buildMetadata({ title: "Answer not found", description: "This helpdesk entry is not available.", path: `/helpdesk/${id}`, noIndex: true });
  return buildMetadata({
    title: entry.question,
    description: entry.answer.slice(0, 155),
    path: `/helpdesk/${id}`,
    keywords: ["helpdesk"],
    extraKeywords: [entry.question, ...entry.keywords],
  });
}

export default function HelpdeskEntryPage({ params }: Props) {
  return (
    <Suspense fallback={<Skeleton className="container-app my-10 h-72 rounded-3xl" />}>
      <HelpdeskEntry params={params} />
    </Suspense>
  );
}

async function HelpdeskEntry({ params }: Props) {
  const { id } = await params;
  const entry = await getHelpdeskEntry(id);
  if (!entry) notFound();
  const category = labelOf(KB_CATEGORY, entry.category);

  return (
    <>
      <JsonLd data={faqJsonLd([{ question: entry.question, answer: entry.answer }])} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Helpdesk", path: "/helpdesk" }, { name: entry.question, path: `/helpdesk/${entry.id}` }])} />
      <div className="container-app max-w-3xl py-8 sm:py-12">
        <PageHeader
          breadcrumbs={[{ label: "Home", href: "/" }, { label: "Helpdesk", href: "/helpdesk" }, { label: category.label }]}
          eyebrow={<Badge tone={category.tone}>{category.label}</Badge>}
          title={entry.question}
        />
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 sm:p-8">
          <p className="whitespace-pre-line text-lg leading-relaxed text-fg-muted [overflow-wrap:anywhere]">{entry.answer}</p>
          <p className="mt-6 text-xs text-fg-subtle">Last updated {formatDate(entry.updatedAt)}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <AskAssistantButton variant="gradient" question={entry.question}>
            <MessageCircleQuestion /> Ask a follow-up
          </AskAssistantButton>
          <Button asChild variant="secondary">
            <Link href="/helpdesk">More answers</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
