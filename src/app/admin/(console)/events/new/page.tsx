import type { Metadata } from "next";
import { EventForm } from "@/components/admin/events/event-form";

export const metadata: Metadata = { title: "New event" };

export default function NewEventPage() {
  return <EventForm />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
