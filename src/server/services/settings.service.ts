import type { Prisma } from "@/generated/prisma/client";
import { revalidateSettings } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import type { AuthUser } from "@/server/middleware/auth";
import { readSiteSettings } from "@/server/queries/settings.queries";
import { audit } from "@/server/services/audit.service";
import type { SiteSettings, UpdateSiteSettingsInput } from "@/server/validators/settings.validators";

/**
 * Merges the change into the stored document, audits it and expires the
 * `settings` tag so the banner / maintenance state changes on the next request.
 */
export async function updateSiteSettings(actor: AuthUser, input: UpdateSiteSettingsInput, request: Request): Promise<SiteSettings> {
  const next: SiteSettings = { ...(await readSiteSettings()), ...input };
  const value = next as unknown as Prisma.InputJsonObject;
  await prisma.siteSetting.upsert({
    where: { key: "site" },
    create: { key: "site", value, updatedById: actor.id },
    update: { value, updatedById: actor.id },
    select: { key: true },
  });
  await audit(actor, "settings.update", { type: "SiteSetting", id: "site" }, { fields: Object.keys(input), maintenanceMode: next.maintenanceMode }, request);
  revalidateSettings();
  return next;
}
