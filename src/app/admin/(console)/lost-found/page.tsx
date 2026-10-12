import type { Metadata } from "next";
import { LostFoundAdmin } from "@/components/admin/lost-found/lost-found-admin";

export const metadata: Metadata = { title: "Lost and found" };

export default function Page() {
  return <LostFoundAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
