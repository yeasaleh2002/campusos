import { Suspense } from "react";
import { MaintenanceOverlay } from "@/components/layout/maintenance-overlay";
import { getSiteSettings } from "@/server/queries/settings.queries";

async function GateContent() {
  const { maintenanceMode, maintenanceMessage } = await getSiteSettings();
  if (!maintenanceMode) return null;
  return <MaintenanceOverlay message={maintenanceMessage} />;
}

/**
 * Maintenance mode for the pages. The flag comes from the tag-cached site settings, so pages stay prerendered and
 * the overlay appears the moment an admin turns the switch on (the `settings` tag expires). Staff are let through
 * after sign-in is confirmed in the browser. The proxy separately blocks API writes for everyone but staff.
 */
export function MaintenanceGate() {
  return (
    <Suspense fallback={null}>
      <GateContent />
    </Suspense>
  );
}
