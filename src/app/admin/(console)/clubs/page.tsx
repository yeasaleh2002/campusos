import type { Metadata } from "next";
import { ClubsAdmin } from "@/components/admin/clubs/clubs-admin";

export const metadata: Metadata = { title: "Clubs" };

export default function Page() {
  return <ClubsAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
