import { ok } from "@/lib/api-response";
import { withApiHandler } from "@/lib/errors";
import { getSiteSettings } from "@/server/queries/settings.queries";

/** Public banner + maintenance flag (cached under the `settings` tag). Read by the proxy and the site layout. */
export const GET = withApiHandler(async () => {
  const { bannerMessage, bannerTone, maintenanceMode, maintenanceMessage } = await getSiteSettings();
  return ok({ bannerMessage, bannerTone, maintenanceMode, maintenanceMessage }, { headers: { "cache-control": "public, max-age=0, s-maxage=30, stale-while-revalidate=30" } });
});
