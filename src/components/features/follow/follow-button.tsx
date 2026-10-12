"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellMinus, BellPlus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, type ButtonProps } from "@/components/ui/button";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-client";
import { toastPromise } from "@/lib/toast";

export type FollowTarget = "DEPARTMENT" | "COURSE" | "CLUB";

export interface FollowRow {
  targetType: FollowTarget;
  targetId: string;
  name: string;
  createdAt: string;
}

export function useFollows() {
  const { user } = useAuth();
  return useQuery({
    queryKey: queryKeys.follows,
    enabled: Boolean(user),
    queryFn: () => api.get<FollowRow[]>("/api/me/follows", { notifyUnauthorized: false }),
  });
}

/** Optimistic follow / unfollow toggle for clubs, courses and departments. */
export function FollowButton({ targetType, targetId, name, size = "sm" }: { targetType: FollowTarget; targetId: string; name: string } & Pick<ButtonProps, "size">) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const follows = useFollows();
  const following = follows.data?.some((row) => row.targetType === targetType && row.targetId === targetId) ?? false;

  const mutation = useMutation({
    mutationFn: (next: boolean) => (next ? api.post("/api/follow", { targetType, targetId }) : api.delete("/api/follow", { query: { targetType, targetId } })),
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.follows });
      const previous = queryClient.getQueryData<FollowRow[]>(queryKeys.follows);
      queryClient.setQueryData<FollowRow[]>(queryKeys.follows, (rows = []) =>
        next ? [{ targetType, targetId, name, createdAt: new Date().toISOString() }, ...rows] : rows.filter((row) => !(row.targetType === targetType && row.targetId === targetId)),
      );
      return { previous };
    },
    onError: (_error, _next, context) => queryClient.setQueryData(queryKeys.follows, context?.previous),
    onSettled: () => queryClient.invalidateQueries({ queryKey: queryKeys.follows }),
  });

  const toggle = () => {
    if (!user) {
      router.push(`/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    const next = !following;
    toastPromise(mutation.mutateAsync(next), {
      loading: next ? "Following…" : "Unfollowing…",
      success: next ? `You'll hear about ${name}.` : `Unfollowed ${name}.`,
    }).catch(() => undefined);
  };

  return (
    <Button variant={following ? "soft" : "secondary"} size={size} aria-pressed={following} onClick={toggle} disabled={mutation.isPending}>
      {following ? <BellMinus /> : <BellPlus />} {following ? "Following" : "Follow"}
    </Button>
  );
}
