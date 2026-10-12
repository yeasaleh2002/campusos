import type { Metadata } from "next";
import { IdRoute } from "@/components/admin/id-route";
import { LiveCheckIn } from "@/components/admin/events/live-checkin";

export const metadata: Metadata = { title: "Live check-in" };

export default function CheckInPage({ params }: PageProps<"/admin/events/[id]/checkin">) {
  return <IdRoute params={params}>{(id) => <LiveCheckIn eventId={id} />}</IdRoute>;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
