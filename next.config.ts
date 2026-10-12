import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/** UploadThing serves files from utfs.io and <app-id>.ufs.sh. */
const UPLOAD_HOSTS = ["https://utfs.io", "https://*.ufs.sh"];
const TURNSTILE_HOST = "https://challenges.cloudflare.com";

const contentSecurityPolicy = [
  "default-src 'self'",
  // Next.js injects inline bootstrap scripts; 'unsafe-eval' is needed only by the dev overlay.
  `script-src 'self' 'unsafe-inline' ${TURNSTILE_HOST}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${UPLOAD_HOSTS.join(" ")}`,
  "font-src 'self' data:",
  `connect-src 'self' https://*.uploadthing.com https://*.ingest.uploadthing.com ${UPLOAD_HOSTS.join(" ")}`,
  // UploadThing hosts: inline PDF preview on resource pages.
  `frame-src ${TURNSTILE_HOST} ${UPLOAD_HOSTS.join(" ")}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Native/dynamic-require packages must stay external to the server bundle.
  serverExternalPackages: ["image-video-compressor", "fluent-ffmpeg", "ffmpeg-static", "ffprobe-static"],
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.ufs.sh" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
