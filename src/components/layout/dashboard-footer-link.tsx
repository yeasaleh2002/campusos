"use client";

import Link from "next/link";
import { dashboardHref } from "@/components/layout/nav-config";
import { useAuth } from "@/components/providers/auth-provider";

/** Footer "Dashboard" link that follows the role: staff go to the admin dashboard, everyone else to the student one. */
export function DashboardFooterLink({ className }: { className?: string }) {
  const { isStaff } = useAuth();
  return (
    <Link href={dashboardHref(isStaff)} prefetch={false} className={className}>
      Dashboard
    </Link>
  );
}
