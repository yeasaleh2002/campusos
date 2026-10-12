"use client";

import { LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";
import { NotificationBell } from "@/components/layout/notification-bell";
import { HOME_NAV, isActivePath, USER_NAV } from "@/components/layout/nav-config";
import { UserMenu } from "@/components/layout/user-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/shared/logo";
import { SearchTrigger } from "@/components/shared/command-palette-trigger";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/** Signed-in portal chrome: desktop sidebar, topbar, mobile bottom tabs. Redirects guests to /login. */
export function UserShell({ children }: { children: ReactNode }) {
  const { status, isStaff } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "guest") router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-surface/80 backdrop-blur-xl lg:flex" aria-label="Dashboard">
        <div className="flex h-16 items-center px-5">
          <Logo />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2" aria-label="Dashboard sections">
          {USER_NAV.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <item.icon className="size-4.5" /> {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-3">
          <Link href={HOME_NAV.href} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg-muted transition hover:bg-surface-2 hover:text-fg">
            <HOME_NAV.icon className="size-4.5" /> Back to campus site
          </Link>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-border bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
          <div className="lg:hidden">
            <Logo compact />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <SearchTrigger compact />
            <NotificationBell />
            <ThemeToggle />
            <UserMenu showDashboardLink={isStaff} />
          </div>
        </header>
        <main id="main" tabIndex={-1} className="px-4 pb-28 pt-6 sm:px-6 lg:pb-12">
          <div className="mx-auto w-full max-w-6xl 2xl:max-w-7xl">
            {status === "loading" || status === "guest" ? <ShellSkeleton /> : children}
          </div>
        </main>
      </div>

      <nav data-bottom-nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Dashboard tabs">
        <ul className="mx-auto flex max-w-xl items-stretch justify-around">
          {USER_NAV.filter((item) => item.mobile).map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <li key={item.href} className="flex-1">
                <Link href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition", active ? "text-primary" : "text-fg-muted")}>
                  <item.icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <Link href="/" className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-fg-muted">
              <LayoutDashboard className="size-5" />
              Explore
            </Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
    </div>
  );
}
