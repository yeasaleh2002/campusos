import type { Metadata } from "next";
import { SettingsAdmin } from "@/components/admin/settings/settings-admin";

export const metadata: Metadata = { title: "Settings" };

export default function Page() {
  return <SettingsAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
