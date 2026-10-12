import type { Metadata } from "next";
import { UsersAdmin } from "@/components/admin/users/users-admin";

export const metadata: Metadata = { title: "Users" };

export default function Page() {
  return <UsersAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
