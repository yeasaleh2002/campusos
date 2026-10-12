import {
  Bell,
  Bookmark,
  Bus,
  CalendarDays,
  CalendarHeart,
  ClipboardList,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  Megaphone,
  MessageSquareWarning,
  PackageSearch,
  Ticket,
  Upload,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

/** Primary public navigation (navbar + mobile drawer + footer). */
export const PUBLIC_NAV: NavItem[] = [
  { label: "Events", href: "/events", icon: CalendarDays, description: "Club events, seminars & fests" },
  { label: "Clubs", href: "/clubs", icon: Users, description: "Find your people" },
  { label: "Resources", href: "/resources", icon: FileText, description: "Notes & previous questions" },
  { label: "Bus", href: "/bus", icon: Bus, description: "Routes & next departures" },
  { label: "Notices", href: "/notices", icon: Megaphone, description: "Official updates & cancellations" },
  { label: "Helpdesk", href: "/helpdesk", icon: HelpCircle, description: "FAQ & campus assistant" },
  { label: "Lost & Found", href: "/lost-found", icon: PackageSearch, description: "Report or claim items" },
];

export const SECONDARY_NAV: NavItem[] = [
  { label: "Open forms", href: "/forms", icon: ClipboardList },
  { label: "Submit a complaint", href: "/complaints/new", icon: MessageSquareWarning },
  { label: "Track a complaint", href: "/complaints/track", icon: MessageSquareWarning },
];

/** User portal sidebar. `mobile` items appear in the bottom tab bar. */
export const USER_NAV: Array<NavItem & { mobile?: boolean }> = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard, mobile: true },
  { label: "My tickets", href: "/dashboard/registrations", icon: Ticket, mobile: true },
  { label: "Saved events", href: "/dashboard/saved-events", icon: CalendarHeart },
  { label: "Bookmarks", href: "/dashboard/bookmarks", icon: Bookmark, mobile: true },
  { label: "My uploads", href: "/dashboard/my-resources", icon: FileText },
  { label: "Upload resource", href: "/dashboard/resources/upload", icon: Upload },
  { label: "My lost & found", href: "/dashboard/lost-found", icon: PackageSearch },
  { label: "My complaints", href: "/dashboard/complaints", icon: MessageSquareWarning },
  { label: "Notifications", href: "/dashboard/notifications", icon: Bell, mobile: true },
  { label: "Profile", href: "/dashboard/profile", icon: UserRound },
];

export const HOME_NAV: NavItem = { label: "Home", href: "/", icon: Home };

/** Where "Dashboard" goes for this person: the admin console for staff, the student dashboard for everyone else. */
export const dashboardHref = (isStaff: boolean): string => (isStaff ? "/admin/dashboard" : "/dashboard");

/** Active when the path equals `href` or is nested under it (except "/" and "/dashboard"). */
export function isActivePath(pathname: string, href: string): boolean {
  const base = href.split("?")[0] ?? href;
  if (base === "/" || base === "/dashboard" || base === "/admin/dashboard") return pathname === base;
  return pathname === base || pathname.startsWith(`${base}/`);
}
