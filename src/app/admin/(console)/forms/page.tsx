import type { Metadata } from "next";
import { FormsAdmin } from "@/components/admin/notices/forms-admin";

export const metadata: Metadata = { title: "Forms" };

export default function AdminFormsPage() {
  return <FormsAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
