"use client";

import toast from "react-hot-toast";
import { errorMessage } from "@/lib/api-client";

interface MutationToastMessages {
  loading: string;
  success: string | ((result: unknown) => string);
  /** Override the mapped API error message. */
  error?: string;
}

/**
 * Wraps a mutation in a loading → success/error toast. Errors are mapped from
 * API error codes (RATE_LIMITED, VALIDATION_ERROR, NETWORK_ERROR…) to friendly copy.
 * Re-throws so callers can still branch on failure.
 */
export function toastPromise<T>(promise: Promise<T>, messages: MutationToastMessages): Promise<T> {
  void toast
    .promise(promise, {
      loading: messages.loading,
      success: (result) => (typeof messages.success === "function" ? messages.success(result) : messages.success),
      error: (error: unknown) => messages.error ?? errorMessage(error),
    })
    .catch(() => undefined);
  return promise;
}

export { toast };
