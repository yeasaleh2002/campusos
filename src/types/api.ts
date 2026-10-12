/** Shared API envelope - safe to import from both server and client code. */

export interface ApiMeta {
  page?: number;
  limit?: number;
  nextCursor?: string | null;
  total?: number;
}

export interface ApiErrorBody {
  code: string;
  message: string;
  details?: unknown;
}

export type ApiSuccess<T> = { success: true; data: T; meta?: ApiMeta };
export type ApiFailure = { success: false; error: ApiErrorBody };
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;
