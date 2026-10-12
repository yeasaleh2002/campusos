import type { Metadata } from "next";
import { IdRoute } from "@/components/admin/id-route";
import { EventForm } from "@/components/admin/events/event-form";

export const metadata: Metadata = { title: "Edit event" };

export default function EditEventPage({ params }: PageProps<"/admin/events/[id]/edit">) {
  return <IdRoute params={params}>{(id) => <EventForm eventId={id} />}</IdRoute>;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
