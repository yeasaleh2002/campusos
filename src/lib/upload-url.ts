import { z } from "zod";

/**
 * Only files served by UploadThing may be stored in the database:
 *   https://utfs.io/f/<key>  (legacy)   or   https://<app-id>.ufs.sh/f/<key>
 */
const UFS_HOST = /^[a-z0-9]+\.ufs\.sh$/;
const LEGACY_HOST = "utfs.io";

/** Extracts the UploadThing file key from a trusted URL, or null if untrusted. */
export function uploadKeyFromUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const trustedHost = url.hostname === LEGACY_HOST || UFS_HOST.test(url.hostname);
  if (url.protocol !== "https:" || !trustedHost || url.username || url.password || url.port) return null;

  const match = /^\/f\/([A-Za-z0-9_.-]+)$/.exec(url.pathname);
  return match ? match[1] : null;
}

export function isTrustedUploadUrl(value: string): boolean {
  return uploadKeyFromUrl(value) !== null;
}

/** Zod schema for any stored upload URL. */
export const uploadUrlSchema = z
  .string()
  .max(500)
  .refine(isTrustedUploadUrl, "Must be a file uploaded through CampusOS.");
