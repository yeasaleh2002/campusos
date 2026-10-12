"use client";

import { MessageSquareWarning, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ListView } from "@/components/ui/list-view";
import { Tabs } from "@/components/ui/tabs";
import { useCursorList } from "@/hooks/use-cursor-list";
import { formatRelative } from "@/lib/format";
import { COMPLAINT_CATEGORY, COMPLAINT_STATUS, labelOf } from "@/lib/labels";
import { queryKeys } from "@/lib/query-client";

interface ComplaintRow {
  id: string;
  ticketNo: string;
  category: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

const TABS = [
  { value: "", label: "All" },
  { value: "RECEIVED", label: "Received" },
  { value: "IN_REVIEW", label: "In review" },
  { value: "RESOLVED", label: "Resolved" },
] as const;

export function MyComplaints() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("");
  const list = useCursorList<ComplaintRow>([...queryKeys.myComplaints, tab], "/api/me/complaints", { query: { status: tab } });
  return (
    <div className="space-y-6">
      <Tabs label="Complaint status" items={[...TABS]} value={tab} onValueChange={setTab} />
      <ListView
        list={list}
        getKey={(row) => row.id}
        className="space-y-3"
        media={false}
        renderItem={(row) => {
          const status = labelOf(COMPLAINT_STATUS, row.status);
          const category = labelOf(COMPLAINT_CATEGORY, row.category);
          return (
            <article className="group relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:border-border-strong hover:shadow-md focus-within:ring-2 focus-within:ring-ring">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap gap-2">
                  <Badge tone="outline" className="font-mono">
                    {row.ticketNo}
                  </Badge>
                  <Badge tone={status.tone}>{status.label}</Badge>
                  <Badge tone={category.tone}>{category.label}</Badge>
                </div>
                <h3 className="font-display text-base font-semibold">
                  <Link href={`/dashboard/complaints/${row.ticketNo}`} className="outline-none after:absolute after:inset-0 after:content-['']">
                    {row.subject}
                  </Link>
                </h3>
              </div>
              <p className="text-xs text-fg-subtle">Updated {formatRelative(row.updatedAt)}</p>
            </article>
          );
        }}
        empty={{
          title: "No complaints filed",
          description: "If something on campus is not right, tell us - you will get a ticket and live updates.",
          icon: <MessageSquareWarning />,
          action: (
            <Button asChild variant="gradient">
              <Link href="/complaints/new">
                <Plus /> File a complaint
              </Link>
            </Button>
          ),
        }}
      />
    </div>
  );
}
