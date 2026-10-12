import type { Metadata } from "next";
import { ComplaintsAdmin } from "@/components/admin/complaints/complaints-admin";

export const metadata: Metadata = { title: "Complaints" };

export default function Page() {
  return <ComplaintsAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
