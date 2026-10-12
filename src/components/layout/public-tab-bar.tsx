"use client";

import { Bus, CalendarDays, FileText, Home, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath } from "@/components/layout/nav-config";
import { cn } from "@/lib/utils";

/** Fired by the "More" tab; the site header listens and opens its menu drawer. */
export const OPEN_MENU_EVENT = "campusos:open-menu";

const TABS = [
  { label: "Home", href: "/", icon: Home },
  { label: "Events", href: "/events", icon: CalendarDays },
  { label: "Resources", href: "/resources", icon: FileText },
  { label: "Bus", href: "/bus", icon: Bus },
] as const;

/** App-style bottom tabs for phones only (below md); tablets and desktops keep the top navigation. */
export function PublicTabBar() {
  const pathname = usePathname();
  return (
    <nav data-bottom-nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden" aria-label="Quick navigation">
      <ul className="mx-auto flex max-w-xl items-stretch justify-around">
        {TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : isActivePath(pathname, tab.href);
          return (
            <li key={tab.href} className="flex-1">
              <Link href={tab.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition", active ? "text-primary" : "text-fg-muted")}>
                <tab.icon className="size-5" aria-hidden />
                {tab.label}
              </Link>
            </li>
          );
        })}
        <li className="flex-1">
          <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_MENU_EVENT))} className="flex w-full flex-col items-center gap-1 py-2.5 text-[11px] font-semibold text-fg-muted transition">
            <Menu className="size-5" aria-hidden />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
