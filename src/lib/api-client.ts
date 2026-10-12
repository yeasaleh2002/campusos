import type { ApiMeta, ApiResponse } from "@/types/api";

/**
 * Typed browser client for the CampusOS JSON API. Every endpoint returns the
 * `{ success, data, error, meta }` envelope; this unwraps it, normalises
 * failures into `ApiClientError`, and broadcasts 401s so the AuthProvider can
 * redirect to /login?next=... (internal navigation stays in the router).
 */

export const UNAUTHORIZED_EVENT = "campusos:unauthorized";

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    readonly details?: unknown,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  headers?: HeadersInit;
  /** Broadcast 401s (default true) so the app redirects to sign-in. */
  notifyUnauthorized?: boolean;
}

export interface PageResult<T> {
  data: T;
  meta?: ApiMeta;
}

const FRIENDLY_MESSAGES: Record<string, string> = {
  NETWORK_ERROR: "You seem to be offline. Check your connection and try again.",
  UNAUTHORIZED: "Please sign in to continue.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_FOUND: "We couldn't find what you were looking for.",
  INTERNAL_ERROR: "Something went wrong on our side. Please try again.",
  EMAIL_DELIVERY_FAILED: "We couldn't send the email right now. Please try again in a moment.",
};

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}${path.includes("?") ? "&" : "?"}${qs}` : path;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<PageResult<T>> {
  const isForm = typeof FormData !== "undefined" && options.body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(buildUrl(path, options.query), {
      method,
      credentials: "same-origin",
      signal: options.signal,
      headers: {
        Accept: "application/json",
        ...(options.body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
      body: options.body === undefined ? undefined : isForm ? (options.body as FormData) : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiClientError(FRIENDLY_MESSAGES.NETWORK_ERROR, "NETWORK_ERROR", 0);
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await response.json()) as ApiResponse<T>;
  } catch {
    // Non-JSON (e.g. proxy error page) handled below.
  }

  if (!response.ok || !json || !json.success) {
    const code = json && !json.success ? json.error.code : response.status === 429 ? "RATE_LIMITED" : "INTERNAL_ERROR";
    const message = json && !json.success ? json.error.message : FRIENDLY_MESSAGES[code] ?? `Request failed (${response.status}).`;
    const retryAfter = Number(response.headers.get("retry-after")) || undefined;
    if (response.status === 401 && options.notifyUnauthorized !== false && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT));
    }
    throw new ApiClientError(message, code, response.status, json && !json.success ? json.error.details : undefined, retryAfter);
  }
  return { data: json.data, meta: json.meta };
}

/** First field error from a VALIDATION_ERROR, if any. */
function firstDetail(details: unknown): string | null {
  if (!Array.isArray(details)) return null;
  const first = details[0] as { message?: unknown } | undefined;
  return typeof first?.message === "string" ? first.message : null;
}

/** Human-friendly message for any thrown value. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiClientError) {
    if (error.code === "RATE_LIMITED") {
      const wait = error.retryAfterSeconds;
      const when = wait ? (wait >= 60 ? `${Math.ceil(wait / 60)} min` : `${wait} s`) : "a moment";
      return `${error.message.replace(/\.$/, "")}. Try again in ${when}.`;
    }
    if (error.code === "VALIDATION_ERROR") return firstDetail(error.details) ?? error.message;
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

/** Field → message map for react-hook-form `setError` from a VALIDATION_ERROR. */
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof ApiClientError) || !Array.isArray(error.details)) return {};
  const out: Record<string, string> = {};
  for (const item of error.details as Array<{ path?: unknown; message?: unknown }>) {
    if (typeof item.path === "string" && item.path && typeof item.message === "string" && !out[item.path]) {
      out[item.path] = item.message;
    }
  }
  return out;
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options).then((r) => r.data),
  /** GET returning data + meta (cursor pagination). */
  page: <T>(path: string, options?: RequestOptions) => request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("POST", path, { ...options, body }).then((r) => r.data),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => request<T>("PATCH", path, { ...options, body }).then((r) => r.data),
  delete: <T>(path: string, options?: RequestOptions) => request<T>("DELETE", path, options).then((r) => r.data),
};
