/**
 * Browser-safe configuration. Each value is read with a literal
 * `process.env.NEXT_PUBLIC_*` access so Next.js can inline it at build time.
 * Never add secrets here.
 */
export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "CampusOS - City University",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
} as const;
