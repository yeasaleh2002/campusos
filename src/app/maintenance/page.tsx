import { Wrench } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Logo } from "@/components/shared/logo";
import { getSiteSettings } from "@/server/queries/settings.queries";

export const metadata: Metadata = { title: "Scheduled maintenance", robots: { index: false, follow: false } };

async function MaintenanceMessage() {
  const { maintenanceMessage } = await getSiteSettings();
  return <p className="mt-3 text-fg-muted">{maintenanceMessage ?? "CampusOS is being updated. Please check back in a few minutes."}</p>;
}

/** Shown (with a 503) to non-staff visitors while maintenance mode is on. */
export default function MaintenancePage() {
  return (
    <main id="main" className="relative isolate grid min-h-dvh place-items-center px-4 py-16">
      <div className="bg-mesh absolute inset-0 -z-10" aria-hidden />
      <div className="w-full max-w-lg text-center">
        <Logo className="mb-10 justify-center" href={null} />
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Wrench className="size-8" aria-hidden />
        </span>
        <h1 className="mt-6 font-display text-h2 font-bold">We will be right back</h1>
        <Suspense fallback={<p className="mt-3 text-fg-muted">CampusOS is being updated.</p>}>
          <MaintenanceMessage />
        </Suspense>
        <p className="mt-8 text-xs text-fg-subtle">Designed &amp; developed by Nurix Hive.</p>
      </div>
    </main>
  );
}
