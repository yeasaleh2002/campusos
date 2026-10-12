import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MyComplaints } from "@/components/features/complaints/my-complaints";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "My complaints", description: "Complaints you filed and their status.", path: "/dashboard/complaints", noIndex: true });

export default function MyComplaintsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="My complaints"
        description="Every ticket you filed, with live status."
        actions={
          <Button asChild variant="gradient">
            <Link href="/complaints/new">
              <Plus /> New complaint
            </Link>
          </Button>
        }
      />
      <MyComplaints />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
