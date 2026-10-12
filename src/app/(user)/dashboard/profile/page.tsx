import type { Metadata } from "next";
import { ProfilePanel } from "@/components/features/dashboard/profile-panel";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "Profile & settings", description: "Manage your CampusOS profile, password and preferences.", path: "/dashboard/profile", noIndex: true });

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Profile & settings" description="Your details, security and preferences." />
      <ProfilePanel />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
