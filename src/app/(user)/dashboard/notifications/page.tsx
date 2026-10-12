import type { Metadata } from "next";
import { NotificationsList } from "@/components/features/dashboard/notifications-list";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Notifications", description: "Updates on your tickets, claims and followed clubs.", path: "/dashboard/notifications", noIndex: true });

export default function NotificationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Notifications" description="Everything that needs your attention." />
      <NotificationsList />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
