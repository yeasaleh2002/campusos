import type { Metadata } from "next";
import { BusAdmin } from "@/components/admin/bus/bus-admin";

export const metadata: Metadata = { title: "Bus routes" };

export default function AdminBusPage() {
  return <BusAdmin />;
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
