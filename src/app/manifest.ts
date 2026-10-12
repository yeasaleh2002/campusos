import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/seo";

/** Installable PWA manifest (icons generated from src/app/icon.svg). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: `${siteConfig.name} - City University`,
    short_name: siteConfig.shortName,
    description: siteConfig.description,
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f6f7fb",
    theme_color: "#4338ca",
    categories: ["education", "productivity"],
    lang: "en-BD",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Next bus", url: "/bus", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Events", url: "/events", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My tickets", url: "/dashboard/registrations", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
