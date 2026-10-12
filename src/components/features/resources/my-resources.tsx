"use client";

import { FileUp } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ListView } from "@/components/ui/list-view";
import { Tabs } from "@/components/ui/tabs";
import { useCursorList } from "@/hooks/use-cursor-list";
import { formatDate } from "@/lib/format";
import { MODERATION_STATUS, RESOURCE_TYPE, labelOf } from "@/lib/labels";
import { queryKeys } from "@/lib/query-client";

interface MyResourceRow {
  id: string;
  title: string;
  type: string;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  downloadCount: number;
  createdAt: string;
  department: { code: string };
  course: { code: string } | null;
}

const TABS = [
  { value: "", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Live" },
  { value: "REJECTED", label: "Rejected" },
] as const;

/** The user's uploads with moderation status and rejection reasons. */
export function MyResources() {
  const [tab, setTab] = useState<(typeof TABS)[number]["value"]>("");
  const list = useCursorList<MyResourceRow>([...queryKeys.myResources, tab], "/api/me/resources", { query: { status: tab } });

  return (
    <div className="space-y-6">
      <Tabs label="Moderation status" items={[...TABS]} value={tab} onValueChange={setTab} />
      <ListView
        list={list}
        getKey={(row) => row.id}
        className="space-y-3"
        media={false}
        renderItem={(row) => {
          const status = labelOf(MODERATION_STATUS, row.status);
          const type = labelOf(RESOURCE_TYPE, row.type);
          return (
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1.5 flex flex-wrap gap-2">
                    <Badge tone={status.tone}>{status.label}</Badge>
                    <Badge tone={type.tone}>{type.label}</Badge>
                    <Badge tone="outline">{row.course?.code ?? row.department.code}</Badge>
                  </div>
                  <h3 className="font-display text-base font-semibold">
                    {row.status === "APPROVED" ? (
                      <Link href={`/resources/${row.id}`} className="hover:text-primary hover:underline">
                        {row.title}
                      </Link>
                    ) : (
                      row.title
                    )}
                  </h3>
                  <p className="mt-1 text-xs text-fg-subtle">
                    Submitted {formatDate(row.createdAt)} · {row.downloadCount} downloads
                  </p>
                </div>
              </div>
              {row.status === "REJECTED" && row.rejectionReason && (
                <p className="mt-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
                  <strong>Moderator note:</strong> {row.rejectionReason}
                </p>
              )}
            </Card>
          );
        }}
        empty={{
          title: "No uploads here yet",
          description: "Share your notes or previous questions - it takes a minute.",
          icon: <FileUp />,
          action: (
            <Button asChild variant="gradient">
              <Link href="/dashboard/resources/upload">Upload a resource</Link>
            </Button>
          ),
        }}
      />
    </div>
  );
}
