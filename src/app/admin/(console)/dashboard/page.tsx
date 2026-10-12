import type { Metadata } from "next";
import { AdminDashboard } from "@/components/admin/dashboard/admin-dashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function AdminDashboardPage() {
  return <AdminDashboard />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
