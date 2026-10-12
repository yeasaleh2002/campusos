import type { NextRequest } from "next/server";
import { z } from "zod";

/** Prisma cuid() ids. */
export const idSchema = z.string().regex(/^c[a-z0-9]{20,32}$/, "Invalid id.");

/** Route params of the form `[id]`. */
export const idParamsSchema = z.object({ id: idSchema });

export const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug.").max(220);

/** Opaque pagination cursor (base64url JSON or an id). */
export const cursorSchema = z.string().max(300).regex(/^[A-Za-z0-9_-]+$/, "Invalid cursor.");

export const limitSchema = z.coerce.number().int().min(1).max(50).default(20);

/** Shared `?cursor=&limit=` fields for list endpoints. */
export const paginationShape = {
  cursor: cursorSchema.optional(),
  limit: limitSchema,
};

/** Empty query values (`?q=`) are treated as absent. */
function searchParamsToObject(request: NextRequest): Record<string, string> {
  const entries = [...request.nextUrl.searchParams.entries()].filter(([, value]) => value.trim() !== "");
  return Object.fromEntries(entries);
}

/** Validates the query string with a strict schema. */
export function parseQuery<Schema extends z.ZodType>(request: NextRequest, schema: Schema): z.infer<Schema> {
  return schema.parse(searchParamsToObject(request));
}

/** Validates awaited route params. */
export function parseParams<Schema extends z.ZodType>(params: unknown, schema: Schema): z.infer<Schema> {
  return schema.parse(params);
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
}

/**
 * Turns a `take: limit + 1` result into a page. `cursorOf` builds the cursor
 * from the last returned item.
 */
export function toPage<T>(rows: T[], limit: number, cursorOf: (item: T) => string): Page<T> {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  return { items, nextCursor: hasMore ? cursorOf(items[items.length - 1]) : null };
}

/** Encodes a keyset cursor as base64url JSON. */
export function encodeCursor(value: Record<string, string | number>): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** Decodes a keyset cursor; returns null for anything malformed. */
export function decodeCursor<Schema extends z.ZodType>(cursor: string | undefined, schema: Schema): z.infer<Schema> | null {
  if (!cursor) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
