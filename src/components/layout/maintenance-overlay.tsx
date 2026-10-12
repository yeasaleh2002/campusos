"use client";

import { Wrench } from "lucide-react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { Logo } from "@/components/shared/logo";
import { useAuth } from "@/components/providers/auth-provider";

/** Pages that stay usable during maintenance: the staff console (sign-in included) and the maintenance page itself. */
const OPEN_PREFIXES = ["/admin", "/maintenance"];

function Overlay({ message }: { message: string | null }) {
  const pathname = usePathname();
  const { isStaff } = useAuth();
  if (isStaff || OPEN_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) return null;
  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="maintenance-title" className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-bg px-4 py-16">
      <div className="bg-mesh absolute inset-0 -z-10" aria-hidden />
      <div className="w-full max-w-lg text-center">
        <Logo className="mb-10 justify-center" href={null} />
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary-soft text-primary">
          <Wrench className="size-8" aria-hidden />
        </span>
        <h1 id="maintenance-title" className="mt-6 font-display text-h2 font-bold">
          We will be right back
        </h1>
        <p className="mt-3 text-fg-muted">{message ?? "CampusOS is being updated. Please check back in a few minutes."}</p>
        <p className="mt-8 text-xs text-fg-subtle">Designed &amp; developed by Nurix Hive.</p>
      </div>
    </div>
  );
}

/** Full-screen "We will be right back" cover for visitors while maintenance mode is on. */
export function MaintenanceOverlay({ message }: { message: string | null }) {
  return (
    <Suspense fallback={null}>
      <Overlay message={message} />
    </Suspense>
  );
}
