"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import type { EventCardData } from "@/components/features/events/event-card";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { toastPromise } from "@/lib/toast";

export interface MyRegistrationRow {
  id: string;
  status: "REGISTERED" | "CHECKED_IN" | "CANCELLED";
  checkedInAt: string | null;
  createdAt: string;
  event: EventCardData;
}

export interface SavedEventRow {
  id: string;
  createdAt: string;
  event: EventCardData;
}

/** Latest registrations (bounded to 50) used to show "You're going" state across pages. */
export function useRegistrationIndex() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.registrationIndex,
    enabled: Boolean(user),
    queryFn: () => api.get<MyRegistrationRow[]>("/api/me/registrations", { query: { limit: 50 }, notifyUnauthorized: false }),
  });
}

export function useSavedIndex() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.savedIndex,
    enabled: Boolean(user),
    queryFn: () => api.get<SavedEventRow[]>("/api/me/saved-events", { query: { limit: 50 }, notifyUnauthorized: false }),
  });
}

/** Optimistic save / unsave of an event; rolls back on failure. */
export function useToggleSave(event: EventCardData) {
  const queryClient = useQueryClient();
  const saved = useSavedIndex();
  const isSaved = saved.data?.some((row) => row.event.id === event.id) ?? false;

  const mutation = useMutation({
    mutationFn: (next: boolean) => (next ? api.post(`/api/events/${event.id}/save`) : api.delete(`/api/events/${event.id}/save`)),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.savedIndex });
      const previous = queryClient.getQueryData<SavedEventRow[]>(queryKeys.savedIndex);
      queryClient.setQueryData<SavedEventRow[]>(queryKeys.savedIndex, (rows = []) =>
        next ? [{ id: `optimistic-${event.id}`, createdAt: new Date().toISOString(), event }, ...rows] : rows.filter((row) => row.event.id !== event.id),
      );
      return { previous };
    },
    onError: (_error, _next, context) => queryClient.setQueryData(queryKeys.savedIndex, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.savedEvents }).then(() => queryClient.invalidateQueries({ queryKey: queryKeys.savedIndex })),
  });

  const toggle = () => {
    const next = !isSaved;
    return toastPromise(mutation.mutateAsync(next), { loading: next ? "Saving…" : "Removing…", success: next ? "Event saved." : "Removed from saved events." });
  };
  return { isSaved, toggle, pending: mutation.isPending };
}

/** Register / cancel with optimistic cache updates and toasts. */
export function useEventRegistration(event: EventCardData) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const index = useRegistrationIndex();
  const registration = index.data?.find((row) => row.event.id === event.id && row.status !== "CANCELLED") ?? null;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["me", "registrations"] });
    await queryClient.invalidateQueries({ queryKey: ["event", event.slug] });
    router.refresh();
  };

  const register = useMutation({
    mutationFn: () => api.post<{ message: string; registration: MyRegistrationRow }>(`/api/events/${event.id}/register`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.registrationIndex });
      const previous = queryClient.getQueryData<MyRegistrationRow[]>(queryKeys.registrationIndex);
      const optimistic: MyRegistrationRow = { id: `optimistic-${event.id}`, status: "REGISTERED", checkedInAt: null, createdAt: new Date().toISOString(), event };
      queryClient.setQueryData<MyRegistrationRow[]>(queryKeys.registrationIndex, (rows = []) => [optimistic, ...rows]);
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(queryKeys.registrationIndex, context?.previous),
    onSettled: refresh,
  });

  const cancel = useMutation({
    mutationFn: () => api.delete(`/api/events/${event.id}/register`),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: queryKeys.registrationIndex });
      const previous = queryClient.getQueryData<MyRegistrationRow[]>(queryKeys.registrationIndex);
      queryClient.setQueryData<MyRegistrationRow[]>(queryKeys.registrationIndex, (rows = []) => rows.filter((row) => row.event.id !== event.id));
      return { previous };
    },
    onError: (_error, _vars, context) => queryClient.setQueryData(queryKeys.registrationIndex, context?.previous),
    onSettled: refresh,
  });

  return {
    registration,
    loading: index.isPending && index.fetchStatus !== "idle",
    register: () => toastPromise(register.mutateAsync(), { loading: "Reserving your seat…", success: "You're in! Your QR ticket is ready." }),
    cancel: () => toastPromise(cancel.mutateAsync(), { loading: "Cancelling…", success: "Registration cancelled." }),
    pending: register.isPending || cancel.isPending,
  };
}
