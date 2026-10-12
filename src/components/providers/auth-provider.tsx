"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo } from "react";
import { api, ApiClientError, UNAUTHORIZED_EVENT } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import type { PublicUser } from "@/server/repositories/user.repository";
import type { Serialized } from "@/types/serialized";

export type CurrentUser = Serialized<PublicUser>;

type AuthStatus = "loading" | "authenticated" | "guest";

interface AuthContextValue {
  user: CurrentUser | null;
  status: AuthStatus;
  isStaff: boolean;
  /** Re-reads /api/auth/me (after login, profile edits...). */
  refresh: () => Promise<void>;
  /** Stores a user returned by login/verify without another round-trip. */
  setUser: (user: CurrentUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STAFF_ROLES = new Set(["MODERATOR", "CLUB_ADMIN", "ADMIN", "SUPER_ADMIN"]);
const PROTECTED_PREFIXES = ["/dashboard", "/admin"];

async function fetchMe(): Promise<CurrentUser | null> {
  try {
    const { user } = await api.get<{ user: CurrentUser }>("/api/auth/me", { notifyUnauthorized: false });
    return user;
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 401) return null;
    throw error;
  }
}

/** Session state from /api/auth/me, shared app-wide. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data, isPending } = useQuery({ queryKey: queryKeys.me, queryFn: fetchMe, staleTime: 5 * 60_000 });

  const setUser = useCallback((user: CurrentUser | null) => queryClient.setQueryData(queryKeys.me, user), [queryClient]);
  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.me });
  }, [queryClient]);

  const logout = useCallback(async () => {
    await api.post("/api/auth/logout").catch(() => undefined);
    queryClient.clear();
    queryClient.setQueryData(queryKeys.me, null);
    router.push("/");
  }, [queryClient, router]);

  // Any API 401: drop the cached user; on protected pages, go to sign-in.
  useEffect(() => {
    const onUnauthorized = () => {
      // Read the live location instead of usePathname(): that hook would block prerendering of every dynamic route.
      const pathname = window.location.pathname;
      queryClient.setQueryData(queryKeys.me, null);
      if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && pathname !== "/admin/login") {
        const login = pathname.startsWith("/admin") ? "/admin/login" : "/login";
        router.push(`${login}?next=${encodeURIComponent(pathname)}`);
      }
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [queryClient, router]);

  const value = useMemo<AuthContextValue>(() => {
    const user = data ?? null;
    return {
      user,
      status: isPending ? "loading" : user ? "authenticated" : "guest",
      isStaff: user ? STAFF_ROLES.has(user.role) : false,
      refresh,
      setUser,
      logout,
    };
  }, [data, isPending, refresh, setUser, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}

/** Returns a function that sends guests to sign-in (keeping where they were), or runs `action`. */
export function useRequireUser() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (action: () => void) => {
      if (user) action();
      else router.push(`/login?next=${encodeURIComponent(pathname)}`);
    },
    [user, router, pathname],
  );
}
