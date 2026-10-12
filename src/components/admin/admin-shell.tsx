"use client";

import { ChevronsLeft, ExternalLink, LogOut, Menu, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { canOpenRoute, navFor } from "@/components/admin/admin-nav";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo, LogoMark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toastPromise } from "@/lib/toast";
import { cn } from "@/lib/utils";

function NavList({ collapsed, role, onNavigate }: { collapsed: boolean; role: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const items = navFor(role);
  const groups = [...new Set(items.map((item) => item.group))];
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4" aria-label="Admin sections">
      {groups.map((group) => (
        <div key={group}>
          <p className={cn("mb-1.5 px-3 text-[0.65rem] font-semibold uppercase tracking-widest text-fg-subtle", collapsed && "sr-only")}>{group}</p>
          <ul className="space-y-0.5">
            {items
              .filter((item) => item.group === group)
              .map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-2 hover:text-fg",
                        collapsed && "justify-center px-0",
                      )}
                    >
                      <item.icon className="size-[1.1rem] shrink-0" aria-hidden />
                      <span className={cn(collapsed && "sr-only")}>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Forbidden({ role }: { role: string }) {
  return (
    <div className="grid min-h-[60dvh] place-items-center p-6">
      <div className="max-w-md text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-danger-soft text-danger">
          <ShieldAlert className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">You do not have access to this section</h1>
        <p className="mt-2 text-sm text-fg-muted">Your role ({role.replace("_", " ").toLowerCase()}) cannot open this page. Ask a super admin if you need more access.</p>
        <Button asChild className="mt-6">
          <Link href="/admin/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}

/** Staff-only console chrome: collapsible role-aware sidebar, topbar, mobile drawer, role route guard. */
export function AdminShell({ children }: { children: ReactNode }) {
  const { user, status, isStaff, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);

  useEffect(() => {
    if (status === "guest") router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    else if (status === "authenticated" && !isStaff) router.replace("/dashboard");
  }, [status, isStaff, pathname, router]);

  const ready = status === "authenticated" && isStaff && user;
  const role = user?.role ?? "";

  const signOut = async () => {
    await toastPromise(logout(), { loading: "Signing out…", success: "Signed out." });
    router.push("/admin/login");
  };

  return (
    <div className="flex min-h-dvh bg-bg text-fg">
      <aside
        className={cn("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex", collapsed ? "w-[4.5rem]" : "w-64")}
        aria-label="Admin"
      >
        <div className={cn("flex h-16 items-center border-b border-border px-4", collapsed && "justify-center")}>
          {collapsed ? (
            <Link href="/admin/dashboard" aria-label="CampusOS admin">
              <LogoMark className="size-8" />
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Logo href="/admin/dashboard" />
              <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-primary-soft-fg">Admin</span>
            </div>
          )}
        </div>
        {ready && <NavList collapsed={collapsed} role={role} />}
        <div className="space-y-1 border-t border-border p-3">
          <Link
            href="/"
            target="_blank"
            rel="noopener"
            className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg", collapsed && "justify-center px-0")}
          >
            <ExternalLink className="size-4" aria-hidden />
            <span className={cn(collapsed && "sr-only")}>View public site</span>
          </Link>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-pressed={collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg", collapsed && "justify-center px-0")}
          >
            <ChevronsLeft className={cn("size-4 transition-transform", collapsed && "rotate-180")} aria-hidden />
            <span className={cn(collapsed && "sr-only")}>Collapse</span>
          </button>
          <p className={cn("px-3 pt-2 text-[0.65rem] text-fg-subtle", collapsed && "sr-only")}>Built by Nurix Hive</p>
        </div>
      </aside>

      <Sheet open={drawer} onClose={() => setDrawer(false)} side="left" title="Admin menu">
        {ready ? <NavList collapsed={false} role={role} onNavigate={() => setDrawer(false)} /> : null}
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setDrawer(true)} aria-label="Open admin menu" className="grid size-10 place-items-center rounded-xl text-fg-muted hover:bg-surface-2 lg:hidden">
              <Menu className="size-5" />
            </button>
            <span className="text-sm font-semibold lg:hidden">Admin</span>
            <span className="hidden text-xs text-fg-subtle lg:block">
              CampusOS <span aria-hidden>/</span> <span className="text-fg">Admin console</span>
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            {ready && (
              <>
                <span className="hidden max-w-40 truncate text-sm text-fg-muted sm:block">{user.name}</span>
                <span className="rounded-lg bg-accent-soft px-2 py-1 text-xs font-semibold text-accent-soft-fg">{role.replace("_", " ")}</span>
                <button type="button" onClick={() => void signOut()} aria-label="Sign out" className="grid size-10 place-items-center rounded-xl text-fg-muted transition hover:bg-danger-soft hover:text-danger">
                  <LogOut className="size-4" />
                </button>
              </>
            )}
          </div>
        </header>
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          {!ready ? <ConsoleSkeleton /> : canOpenRoute(role, pathname) ? children : <Forbidden role={role} />}
        </main>
      </div>
    </div>
  );
}

function ConsoleSkeleton() {
  return (
    <div className="space-y-4 p-6" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
