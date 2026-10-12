import type { Metadata } from "next";
import { IdRoute } from "@/components/admin/id-route";
import { RegistrationsAdmin } from "@/components/admin/events/registrations-admin";

export const metadata: Metadata = { title: "Registrations" };

export default function RegistrationsPage({ params }: PageProps<"/admin/events/[id]/registrations">) {
  return <IdRoute params={params}>{(id) => <RegistrationsAdmin eventId={id} />}</IdRoute>;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
