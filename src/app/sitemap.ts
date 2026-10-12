import type { MetadataRoute } from "next";
import { publicEnv } from "@/config/public-env";
import { getSitemapEntries } from "@/server/queries/platform.queries";

const STATIC_PATHS = ["/", "/events", "/clubs", "/resources", "/notices", "/forms", "/bus", "/helpdesk", "/lost-found", "/contributors"];

/** Sitemap of public pages plus every published event, resource, notice, club and FAQ (tag-cached). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = await getSitemapEntries();
  const base = publicEnv.appUrl.replace(/\/$/, "");
  return [
    ...STATIC_PATHS.map((path) => ({ url: `${base}${path}` })),
    ...entries.map((entry) => ({ url: `${base}${entry.path}`, lastModified: entry.lastModified })),
  ];
}
