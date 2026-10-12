import type { Metadata } from "next";
import { AcademicsAdmin } from "@/components/admin/academics/academics-admin";

export const metadata: Metadata = { title: "Departments and courses" };

export default function Page() {
  return <AcademicsAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
