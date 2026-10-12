import { z } from "zod";

export const BANNER_TONES = ["info", "warning", "urgent"] as const;

/** The whole site configuration document (stored as one JSON row). */
export const siteSettingsSchema = z
  .object({
    bannerMessage: z.string().trim().max(300).nullable(),
    bannerTone: z.enum(BANNER_TONES),
    maintenanceMode: z.boolean(),
    maintenanceMessage: z.string().trim().max(300).nullable(),
  })
  .strict();

export const updateSiteSettingsSchema = siteSettingsSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, { message: "Provide at least one setting." });

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
export type UpdateSiteSettingsInput = z.infer<typeof updateSiteSettingsSchema>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  bannerMessage: null,
  bannerTone: "info",
  maintenanceMode: false,
  maintenanceMessage: null,
};
