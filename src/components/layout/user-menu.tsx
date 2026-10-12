"use client";

import { Bell, LayoutDashboard, LogOut, ShieldCheck, Ticket, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { dashboardHref } from "@/components/layout/nav-config";
import { DropdownMenu, type MenuItem } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toastPromise } from "@/lib/toast";

/** Navbar account area: sign-in buttons for guests, avatar menu for members. */
export function UserMenu({ showDashboardLink = true }: { showDashboardLink?: boolean }) {
  const { user, status, isStaff, logout } = useAuth();
  const router = useRouter();

  if (status === "loading") return <Skeleton className="size-10 rounded-xl" />;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild variant="primary" size="sm">
          <Link href="/signup">Get started</Link>
        </Button>
      </div>
    );
  }

  const items: MenuItem[] = [
    ...(showDashboardLink ? [{ type: "link" as const, label: isStaff ? "Admin dashboard" : "Dashboard", href: dashboardHref(isStaff), icon: <LayoutDashboard /> }] : []),
    { type: "link", label: "My tickets", href: "/dashboard/registrations", icon: <Ticket /> },
    { type: "link", label: "Notifications", href: "/dashboard/notifications", icon: <Bell /> },
    { type: "link", label: "Profile & settings", href: "/dashboard/profile", icon: <UserRound /> },
    ...(isStaff ? [{ type: "link" as const, label: "My student view", href: "/dashboard", icon: <ShieldCheck /> }] : []),
    { type: "separator" },
    {
      type: "action",
      label: "Sign out",
      icon: <LogOut />,
      danger: true,
      onSelect: () => {
        void toastPromise(logout(), { loading: "Signing out…", success: "Signed out. See you soon!" }).then(() => router.push("/"));
      },
    },
  ];

  return (
    <DropdownMenu
      align="end"
      header={
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <p className="truncate text-xs text-fg-subtle">{user.email}</p>
        </div>
      }
      items={items}
      trigger={({ open, toggle, id }) => (
        <button type="button" onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-controls={id} className="rounded-xl p-0.5 transition hover:ring-2 hover:ring-primary/30" aria-label="Account menu">
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
        </button>
      )}
    />
  );
}
