import type { Metadata } from "next";
import { Suspense } from "react";
import { HelpdeskAdmin } from "@/components/admin/helpdesk/helpdesk-admin";

export const metadata: Metadata = { title: "Helpdesk and chatbot" };

export default function AdminHelpdeskPage() {
  return (
    <Suspense fallback={null}>
      <HelpdeskAdmin />
    </Suspense>
  );
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
