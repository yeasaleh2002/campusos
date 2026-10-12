import { type QueryClient as QueryClientType, QueryClient } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api-client";

/** Never retry client errors (4xx); retry network/5xx up to twice. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiClientError && error.status >= 400 && error.status < 500) return false;
  return failureCount < 2;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: shouldRetry,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
}

/** Invalidates every cached Lost & Found list (public board, item pages and the user's own posts). */
export function invalidateLostFound(client: QueryClientType): Promise<void[]> {
  return Promise.all([client.invalidateQueries({ queryKey: ["lost-found"] }), client.invalidateQueries({ queryKey: queryKeys.myLostFound })]);
}

/** Central query keys so invalidations stay consistent. */
export const queryKeys = {
  me: ["me"] as const,
  unread: ["notifications", "unread"] as const,
  notifications: (unreadOnly: boolean) => ["notifications", "list", unreadOnly] as const,
  myRegistrations: (status?: string) => ["me", "registrations", status ?? "all"] as const,
  registrationIndex: ["me", "registrations", "index"] as const,
  savedEvents: ["me", "saved-events"] as const,
  savedIndex: ["me", "saved-events", "index"] as const,
  bookmarks: ["me", "bookmarks"] as const,
  bookmarkIndex: ["me", "bookmarks", "index"] as const,
  myResources: ["me", "resources"] as const,
  myLostFound: ["me", "lost-found"] as const,
  myComplaints: ["me", "complaints"] as const,
  follows: ["me", "follows"] as const,
  search: (q: string) => ["search", q] as const,
};
