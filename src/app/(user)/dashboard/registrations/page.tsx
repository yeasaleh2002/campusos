import type { Metadata } from "next";
import { MyRegistrations } from "@/components/features/events/my-registrations";
import { PageHeader } from "@/components/layout/page-header";
import { buildMetadata } from "@/config/seo";

export const metadata: Metadata = buildMetadata({ title: "My tickets", description: "Your event registrations and QR tickets.", path: "/dashboard/registrations", noIndex: true });

export default function RegistrationsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="My tickets" description="Show your QR ticket at the door. Cancel anytime before the event starts." />
      <MyRegistrations />
    </div>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
