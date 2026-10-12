import type { Metadata } from "next";
import { publicEnv } from "@/config/public-env";
import { type KeywordGroup, keywordsFor } from "@/config/seo-keywords";

export const siteConfig = {
  name: "CampusOS",
  shortName: "CampusOS",
  universityName: "City University",
  universityLegalName: "City University, Bangladesh",
  tagline: "One place for all of City University",
  description:
    "CampusOS is the unified hub for City University students: events and club activities, notes and previous questions, bus schedules, notices and class cancellations, lost & found, complaints and a 24/7 campus assistant.",
  url: publicEnv.appUrl.replace(/\/$/, ""),
  locale: "en_BD",
  universityUrl: "https://www.cityuniversity.ac.bd",
  address: { street: "Khagan, Birulia", locality: "Savar, Dhaka", region: "Dhaka", postalCode: "1216", country: "BD" },
} as const;

/** Absolute URL for a site path. */
export function absoluteUrl(path = "/"): string {
  return `${siteConfig.url}${path.startsWith("/") ? path : `/${path}`}`;
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  keywords?: KeywordGroup[];
  extraKeywords?: readonly string[];
  /** Absolute or site-relative image; defaults to the generated OG image. */
  image?: string | null;
  type?: "website" | "article";
  noIndex?: boolean;
}

/**
 * Page metadata with canonical URL, hreflang-ready alternates, Open Graph and
 * Twitter cards. Titles get the "| CampusOS" suffix from the root template.
 */
export function buildMetadata({ title, description, path, keywords = [], extraKeywords = [], image, type = "website", noIndex }: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const images = image ? [{ url: image.startsWith("http") ? image : absoluteUrl(image), width: 1200, height: 630, alt: title }] : undefined;
  return {
    title,
    description,
    keywords: keywordsFor(keywords, extraKeywords),
    alternates: { canonical: url, languages: { "en-BD": url, "x-default": url } },
    openGraph: { type, url, title, description, siteName: siteConfig.name, locale: siteConfig.locale, ...(images ? { images } : {}) },
    twitter: { card: "summary_large_image", title, description, ...(images ? { images: images.map((i) => i.url) } : {}) },
    robots: noIndex ? { index: false, follow: false } : undefined,
  };
}

/** Root defaults (title template, icons, theme, verification-ready). */
export const rootMetadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: `${siteConfig.name} - ${siteConfig.tagline}`, template: `%s | ${siteConfig.name}` },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: keywordsFor(["home"]),
  authors: [{ name: "Nurix Hive" }, { name: "CampusOS - City University" }],
  creator: "Nurix Hive",
  publisher: siteConfig.universityLegalName,
  category: "education",
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: siteConfig.url, languages: { "en-BD": siteConfig.url, "x-default": siteConfig.url } },
  openGraph: { type: "website", url: siteConfig.url, siteName: siteConfig.name, locale: siteConfig.locale, title: siteConfig.name, description: siteConfig.description },
  twitter: { card: "summary_large_image", title: siteConfig.name, description: siteConfig.description },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
  appleWebApp: { capable: true, title: siteConfig.shortName, statusBarStyle: "black-translucent" },
};

// ───────────── JSON-LD ─────────────

type JsonLdObject = Record<string, unknown>;

export function organizationJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": ["EducationalOrganization", "CollegeOrUniversity"],
    "@id": `${siteConfig.url}/#university`,
    name: siteConfig.universityLegalName,
    alternateName: ["City University", "CU Bangladesh"],
    url: siteConfig.universityUrl,
    address: {
      "@type": "PostalAddress",
      streetAddress: siteConfig.address.street,
      addressLocality: siteConfig.address.locality,
      addressRegion: siteConfig.address.region,
      postalCode: siteConfig.address.postalCode,
      addressCountry: siteConfig.address.country,
    },
  };
}

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    url: siteConfig.url,
    inLanguage: ["en-BD", "bn-BD"],
    publisher: { "@id": `${siteConfig.url}/#university` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${siteConfig.url}/search?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.name, item: absoluteUrl(item.path) })),
  };
}

export function faqJsonLd(items: Array<{ question: string; answer: string }>): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({ "@type": "Question", name: item.question, acceptedAnswer: { "@type": "Answer", text: item.answer } })),
  };
}

interface EventJsonLdInput {
  title: string;
  description: string;
  slug: string;
  startAt: string;
  endAt: string;
  venue: string;
  bannerUrl: string | null;
  clubName: string;
  capacity: number | null;
  registeredCount: number;
  status: string;
}

export function eventJsonLd(event: EventJsonLdInput): JsonLdObject {
  const full = event.capacity !== null && event.registeredCount >= event.capacity;
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description.slice(0, 500),
    startDate: event.startAt,
    endDate: event.endAt,
    eventStatus: event.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.venue, address: { "@type": "PostalAddress", addressLocality: siteConfig.address.locality, addressCountry: "BD" } },
    image: event.bannerUrl ? [event.bannerUrl] : [absoluteUrl("/opengraph-image")],
    organizer: { "@type": "Organization", name: event.clubName, url: siteConfig.url },
    url: absoluteUrl(`/events/${event.slug}`),
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "BDT",
      url: absoluteUrl(`/events/${event.slug}`),
      availability: full ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
    },
  };
}
