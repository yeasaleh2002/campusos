import type { Metadata } from "next";
import { Suspense } from "react";
import { AuditAdmin } from "@/components/admin/audit/audit-admin";

export const metadata: Metadata = { title: "Audit log" };

export default function AuditLogPage() {
  return (
    <Suspense fallback={null}>
      <AuditAdmin />
    </Suspense>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
