import { type ReactNode, Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<Skeleton className="m-6 h-96 rounded-xl " />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
