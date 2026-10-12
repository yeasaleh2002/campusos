"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { toastPromise } from "@/lib/toast";

export interface ResourceCardData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  semester: number | null;
  year: number | null;
  tags: string[];
  fileSize: number;
  downloadCount: number;
  bookmarkCount: number;
  isSample: boolean;
  createdAt: string | Date;
  department: { id?: string; code: string; name?: string };
  course: { id?: string; code: string; title: string } | null;
  courseName?: string | null;
}

export interface BookmarkRow {
  id: string;
  createdAt: string;
  resource: Pick<ResourceCardData, "id" | "title" | "type" | "downloadCount" | "department" | "course"> & Partial<ResourceCardData>;
}

/** Bookmarked resources (first 50) used to render filled bookmark icons across the hub. */
export function useBookmarkIndex() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.bookmarkIndex,
    enabled: Boolean(user),
    queryFn: () => api.get<BookmarkRow[]>("/api/me/bookmarks", { query: { limit: 50 }, notifyUnauthorized: false }),
  });
}

/** Optimistic bookmark toggle with rollback. Guests are redirected to sign in. */
export function useToggleBookmark(resource: Pick<ResourceCardData, "id" | "title" | "type" | "downloadCount" | "department" | "course">) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const index = useBookmarkIndex();
  const bookmarked = index.data?.some((row) => row.resource.id === resource.id) ?? false;

  const mutation = useMutation({
    mutationFn: (next: boolean) => (next ? api.post(`/api/resources/${resource.id}/bookmark`) : api.delete(`/api/resources/${resource.id}/bookmark`)),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.bookmarkIndex });
      const previous = queryClient.getQueryData<BookmarkRow[]>(queryKeys.bookmarkIndex);
      queryClient.setQueryData<BookmarkRow[]>(queryKeys.bookmarkIndex, (rows = []) =>
        next ? [{ id: `optimistic-${resource.id}`, createdAt: new Date().toISOString(), resource }, ...rows] : rows.filter((row) => row.resource.id !== resource.id),
      );
      return { previous };
    },
    onError: (_error, _next, context) => queryClient.setQueryData(queryKeys.bookmarkIndex, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.bookmarks }),
  });

  const toggle = () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !bookmarked;
    toastPromise(mutation.mutateAsync(next), { loading: next ? "Saving…" : "Removing…", success: next ? "Bookmarked." : "Bookmark removed." }).catch(() => undefined);
  };
  return { bookmarked, toggle, pending: mutation.isPending };
}
