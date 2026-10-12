import { redirect } from "next/navigation";

/** /admin redirects to /admin/dashboard */
export default function AdminIndexPage() {
  redirect("/admin/dashboard");
}

/** Signed-in screen rendered after the session loads: exempt from instant-navigation validation. */
export const instant = false;
