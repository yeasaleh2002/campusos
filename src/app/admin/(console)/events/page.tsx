import type { Metadata } from "next";
import { EventsAdmin } from "@/components/admin/events/events-admin";

export const metadata: Metadata = { title: "Events" };

export default function AdminEventsPage() {
  return <EventsAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
