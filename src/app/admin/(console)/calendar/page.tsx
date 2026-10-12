import type { Metadata } from "next";
import { CalendarAdmin } from "@/components/admin/calendar/calendar-admin";

export const metadata: Metadata = { title: "Campus calendar" };

export default function Page() {
  return <CalendarAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
