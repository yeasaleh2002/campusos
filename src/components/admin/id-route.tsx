import { type ReactNode, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

async function Resolved({ params, children }: { params: Promise<{ id: string }>; children: (id: string) => ReactNode }) {
  const { id } = await params;
  return children(id);
}

/** Resolves the `[id]` route param inside Suspense (Cache Components forbids reading it at the page root). */
export function IdRoute({ params, children }: { params: Promise<{ id: string }>; children: (id: string) => ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-96 rounded-2xl" />}>
      <Resolved params={params}>{children}</Resolved>
    </Suspense>
  );
}
