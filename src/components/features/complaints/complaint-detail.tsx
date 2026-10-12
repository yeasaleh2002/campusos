"use client";

import { useQuery } from "@tanstack/react-query";
import { ComplaintView, type TrackedComplaint } from "@/components/features/complaints/complaint-view";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { api } from "@/lib/api-client";

/** Owner view of one ticket (refreshes every minute while open). */
export function ComplaintDetail({ ticketNo }: { ticketNo: string }) {
  const query = useQuery({
    queryKey: ["me", "complaints", ticketNo],
    queryFn: () => api.get<TrackedComplaint>(`/api/complaints/track/${encodeURIComponent(ticketNo)}`),
    refetchInterval: 60_000,
  });
  if (query.isPending) return <Skeleton className="h-96 rounded-2xl" />;
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} title="We could not open this ticket" />;
  return <ComplaintView complaint={query.data} />;
}
