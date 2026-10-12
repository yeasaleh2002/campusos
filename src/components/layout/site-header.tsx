"use client";

import { m } from "framer-motion";
import { LayoutDashboard, LogIn, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { dashboardHref, isActivePath, PUBLIC_NAV, SECONDARY_NAV } from "@/components/layout/nav-config";
import { OPEN_MENU_EVENT } from "@/components/layout/public-tab-bar";
import { UserMenu } from "@/components/layout/user-menu";
import { useAuth } from "@/components/providers/auth-provider";
import { SearchTrigger } from "@/components/shared/command-palette-trigger";
import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Sticky glass navbar; becomes more opaque once the page scrolls. */
export function SiteHeader() {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const open = () => setDrawerOpen(true);
    window.addEventListener(OPEN_MENU_EVENT, open);
    return () => window.removeEventListener(OPEN_MENU_EVENT, open);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      style={{ zIndex: "var(--z-header)" }}
      className={cn("sticky top-0 border-b transition-[background-color,border-color,box-shadow] duration-300", scrolled ? "glass border-glass-border shadow-sm" : "border-transparent bg-transparent")}
    >
      <div className="container-app flex h-16 items-center gap-4 lg:h-[4.25rem]">
        <Logo className="shrink-0" />
        <nav aria-label="Main" className="ml-4 hidden flex-1 xl:block">
          <ul className="flex items-center gap-0.5">
            {PUBLIC_NAV.map((item) => {
              const active = isActivePath(pathname, item.href);
              return (
                <li key={item.href} className="relative">
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("relative block whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition-colors", active ? "text-primary" : "text-fg-muted hover:text-fg")}
                  >
                    {active && <m.span layoutId="nav-pill" className="absolute inset-0 -z-10 rounded-xl bg-primary-soft" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <SearchTrigger className="hidden w-44 2xl:flex" />
          <SearchTrigger compact className="2xl:hidden" />
          <ThemeToggle className="hidden sm:grid" />
          <UserMenu />
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="grid size-10 place-items-center rounded-xl text-fg-muted transition hover:bg-surface-2 hover:text-fg max-md:hidden xl:hidden"
            aria-label="Open menu"
            aria-expanded={drawerOpen}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} pathname={pathname} />
    </header>
  );
}

function MobileDrawer({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const { user, isStaff } = useAuth();
  // Close when navigation completes.
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run on route change only
  }, [pathname]);

  return (
    <Sheet open={open} onClose={onClose} side="left" title={<Logo href={null} />}>
      <div className="flex h-full flex-col">
        <nav aria-label="Mobile">
          <ul className="space-y-1">
            {PUBLIC_NAV.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 transition", active ? "bg-primary-soft text-primary-soft-fg" : "hover:bg-surface-2")}
                  >
                    <span className={cn("grid size-9 place-items-center rounded-lg", active ? "bg-surface/70" : "bg-surface-2")}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span className="block truncate text-xs text-fg-subtle">{item.description}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mb-2 mt-6 px-3 text-[0.7rem] font-semibold uppercase tracking-wider text-fg-subtle">More</p>
          <ul className="space-y-0.5">
            {SECONDARY_NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-lg px-3 py-2 text-sm text-fg-muted transition hover:bg-surface-2 hover:text-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
          {user ? (
            <Button asChild className="flex-1">
              <Link href={dashboardHref(isStaff)}>
                <LayoutDashboard /> Dashboard
              </Link>
            </Button>
          ) : (
            <Button asChild className="flex-1">
              <Link href="/login">
                <LogIn /> Sign in
              </Link>
            </Button>
          )}
          <ThemeToggle />
        </div>
      </div>
    </Sheet>
  );
}
