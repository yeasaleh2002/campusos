import type { Metadata } from "next";
import { Suspense } from "react";
import { NoticesAdmin } from "@/components/admin/notices/notices-admin";

export const metadata: Metadata = { title: "Notices" };

export default function AdminNoticesPage() {
  return (
    <Suspense fallback={null}>
      <NoticesAdmin />
    </Suspense>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
