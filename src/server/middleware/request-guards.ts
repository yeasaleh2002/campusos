import type { NextRequest } from "next/server";
import type { z } from "zod";
import { env } from "@/lib/env";
import {
  BadRequestError,
  ForbiddenError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from "@/lib/errors";

/** Default JSON body limit for API requests. */
export const DEFAULT_MAX_BODY_BYTES = 16 * 1024;

const APP_ORIGIN = new URL(env.NEXT_PUBLIC_APP_URL).origin;

function originOf(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * CSRF defence for mutating requests: the Origin (or, failing that, the Referer)
 * must be the configured app origin or the origin the request was addressed to.
 * Browsers always send Origin on cross-site POST/PATCH/DELETE.
 */
export function assertSameOrigin(request: NextRequest): void {
  const origin = originOf(request.headers.get("origin")) ?? originOf(request.headers.get("referer"));
  if (!origin || (origin !== APP_ORIGIN && origin !== request.nextUrl.origin)) {
    throw new ForbiddenError("Cross-origin request blocked.");
  }
}

function assertJsonContentType(request: Request): void {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new UnsupportedMediaTypeError();
  }
}

async function readLimitedText(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new PayloadTooLargeError();
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > maxBytes) throw new PayloadTooLargeError();
  return text;
}

/**
 * Full guard for JSON mutations: Origin check, JSON-only content type, body size
 * limit, JSON parse and strict Zod validation. Returns the typed body.
 */
export async function parseJsonBody<Schema extends z.ZodType>(
  request: NextRequest,
  schema: Schema,
  maxBytes: number = DEFAULT_MAX_BODY_BYTES,
): Promise<z.infer<Schema>> {
  assertSameOrigin(request);
  assertJsonContentType(request);
  const text = await readLimitedText(request, maxBytes);
  if (!text) throw new BadRequestError("Request body is required.");
  return schema.parse(JSON.parse(text));
}
