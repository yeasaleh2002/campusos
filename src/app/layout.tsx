import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { MaintenanceGate } from "@/components/layout/maintenance-gate";
import { AppProviders } from "@/components/providers/app-providers";
import { CommandPaletteHost } from "@/components/shared/command-palette-trigger";
import { JsonLd } from "@/components/shared/json-ld";
import { organizationJsonLd, rootMetadata, websiteJsonLd } from "@/config/seo";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap", weight: ["500", "600", "700", "800"] });
const bangla = Hind_Siliguri({ subsets: ["bengali"], variable: "--font-bangla", display: "swap", weight: ["400", "500", "600"], preload: false });

export const metadata: Metadata = rootMetadata;

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b0d1a" },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${bricolage.variable} ${bangla.variable}`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://utfs.io" crossOrigin="" />
        <link rel="dns-prefetch" href="https://utfs.io" />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <AppProviders>
          {children}
          <CommandPaletteHost />
          <MaintenanceGate />
        </AppProviders>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
      </body>
    </html>
  );
}
