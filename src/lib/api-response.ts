import { NextResponse } from "next/server";
import type { ApiFailure, ApiMeta, ApiSuccess } from "@/types/api";

interface SuccessOptions {
  status?: number;
  meta?: ApiMeta;
  headers?: HeadersInit;
}

/** 200 (or custom status) success envelope: `{ success: true, data, meta? }`. */
export function ok<T>(data: T, options: SuccessOptions = {}): NextResponse<ApiSuccess<T>> {
  const body: ApiSuccess<T> = options.meta
    ? { success: true, data, meta: options.meta }
    : { success: true, data };
  return NextResponse.json(body, { status: options.status ?? 200, headers: options.headers });
}

/** 201 Created success envelope. */
export function created<T>(data: T, options: Omit<SuccessOptions, "status"> = {}) {
  return ok(data, { ...options, status: 201 });
}

/** Paginated list envelope with cursor metadata. */
export function paginated<T>(items: T[], meta: ApiMeta, headers?: HeadersInit) {
  return ok(items, { meta, headers });
}

/** Error envelope: `{ success: false, error: { code, message, details? } }`. */
export function fail(
  status: number,
  code: string,
  message: string,
  details?: unknown,
  headers?: HeadersInit,
): NextResponse<ApiFailure> {
  const error = details === undefined ? { code, message } : { code, message, details };
  return NextResponse.json({ success: false, error }, { status, headers });
}
