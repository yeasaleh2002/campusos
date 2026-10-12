"use client";

import { useQuery } from "@tanstack/react-query";
import type { CampusClosureLite } from "@/config/campus-calendar";
import { api } from "@/lib/api-client";

const NONE: readonly CampusClosureLite[] = [];

interface CalendarResponse {
  closures: CampusClosureLite[];
}

/** Upcoming special closures from the public (tag-cached) calendar endpoint. Empty until loaded. */
export function useCampusClosures(): readonly CampusClosureLite[] {
  const query = useQuery({ queryKey: ["calendar"], queryFn: () => api.get<CalendarResponse>("/api/calendar"), staleTime: 5 * 60_000 });
  return query.data?.closures ?? NONE;
}
