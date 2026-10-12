import type { Metadata } from "next";
import { ResourcesAdmin } from "@/components/admin/resources/resources-admin";

export const metadata: Metadata = { title: "Resources" };

export default function Page() {
  return <ResourcesAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
