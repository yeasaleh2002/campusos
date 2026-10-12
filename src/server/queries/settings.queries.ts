import { cacheLife, cacheTag } from "next/cache";
import { CacheTags } from "@/lib/cache-tags";
import { prisma } from "@/lib/prisma";
import { DEFAULT_SITE_SETTINGS, type SiteSettings, siteSettingsSchema } from "@/server/validators/settings.validators";

/** Site banner + maintenance switch. Tagged `settings`; expired by the admin settings mutation. */
export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheLife("max");
  cacheTag(CacheTags.settings);
  return readSiteSettings();
}

/** Uncached read (used by the admin form and after writes). Falls back to defaults on any invalid document. */
export async function readSiteSettings(): Promise<SiteSettings> {
  const row = await prisma.siteSetting.findUnique({ where: { key: "site" }, select: { value: true } });
  const parsed = siteSettingsSchema.safeParse({ ...DEFAULT_SITE_SETTINGS, ...(row?.value as object | undefined) });
  return parsed.success ? parsed.data : DEFAULT_SITE_SETTINGS;
}
