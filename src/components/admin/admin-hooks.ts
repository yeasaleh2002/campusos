"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export interface ClubOption {
  id: string;
  name: string;
  slug: string;
}

export interface DepartmentOption {
  id: string;
  code: string;
  name: string;
}

export interface CourseOption {
  id: string;
  code: string;
  title: string;
  semester: number;
  departmentId: string;
}

/** Clubs the signed-in staff member may manage (CLUB_ADMIN: only their own). */
export function useClubOptions() {
  return useQuery({ queryKey: ["admin", "club-options"], queryFn: () => api.get<ClubOption[]>("/api/admin/clubs", { query: { limit: 50, includeInactive: "false" } }), staleTime: 300_000 });
}

export function useDepartmentOptions() {
  return useQuery({ queryKey: ["departments"], queryFn: () => api.get<DepartmentOption[]>("/api/departments"), staleTime: 3_600_000 });
}

export function useCourseOptions(departmentId?: string) {
  return useQuery({
    queryKey: ["admin", "course-options", departmentId ?? "all"],
    queryFn: () => api.get<CourseOption[]>("/api/courses", { query: { departmentId } }),
    staleTime: 300_000,
  });
}
