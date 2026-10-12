import type { Metadata } from "next";
import { DashboardOverview } from "@/components/features/dashboard/overview";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Dashboard", description: "Your CampusOS home: tickets, bookmarks, notifications and complaints.", path: "/dashboard", noIndex: true });

export default function DashboardPage() {
  return <DashboardOverview />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
