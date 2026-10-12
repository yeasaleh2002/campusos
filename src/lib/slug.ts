import { customAlphabet } from "nanoid";

const suffix = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

/** URL-safe slug from free text ("CSE Fest '26!" → "cse-fest-26"). */
export function slugify(text: string, maxLength = 80): string {
  const slug = text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return slug || "item";
}

/** Slug with a short random suffix, used when the plain slug is already taken. */
export function uniqueSlugVariant(base: string): string {
  return `${base}-${suffix()}`;
}
