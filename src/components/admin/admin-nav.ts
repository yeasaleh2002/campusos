import {
  AlertTriangle,
  BookOpen,
  Bus,
  Calendar,
  CalendarOff,
  ClipboardList,
  FileText,
  GraduationCap,
  HelpCircle,
  LayoutDashboard,
  Megaphone,
  PackageSearch,
  Settings,
  Users,
  UsersRound,
} from "lucide-react";
import type { ComponentType } from "react";

export type StaffRole = "MODERATOR" | "CLUB_ADMIN" | "ADMIN" | "SUPER_ADMIN";

const ADMINS: StaffRole[] = ["ADMIN", "SUPER_ADMIN"];
const ALL_STAFF: StaffRole[] = ["MODERATOR", "CLUB_ADMIN", "ADMIN", "SUPER_ADMIN"];

export interface AdminNavItem {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Roles allowed to see the entry and open the route. Mirrors the API permission of the same module. */
  roles: StaffRole[];
  group: "Overview" | "Content" | "Moderation" | "System";
}

export const ADMIN_NAV: AdminNavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ALL_STAFF, group: "Overview" },
  { href: "/admin/events", label: "Events", icon: Calendar, roles: [...ADMINS, "CLUB_ADMIN"], group: "Content" },
  { href: "/admin/clubs", label: "Clubs", icon: UsersRound, roles: [...ADMINS, "CLUB_ADMIN"], group: "Content" },
  { href: "/admin/notices", label: "Notices", icon: Megaphone, roles: ADMINS, group: "Content" },
  { href: "/admin/forms", label: "Forms", icon: FileText, roles: [...ADMINS, "CLUB_ADMIN"], group: "Content" },
  { href: "/admin/bus", label: "Bus", icon: Bus, roles: ADMINS, group: "Content" },
  { href: "/admin/calendar", label: "Campus calendar", icon: CalendarOff, roles: ADMINS, group: "Content" },
  { href: "/admin/helpdesk", label: "Helpdesk & chatbot", icon: HelpCircle, roles: [...ADMINS, "MODERATOR"], group: "Content" },
  { href: "/admin/academics", label: "Departments & courses", icon: GraduationCap, roles: ADMINS, group: "Content" },
  { href: "/admin/resources", label: "Resources", icon: BookOpen, roles: [...ADMINS, "MODERATOR"], group: "Moderation" },
  { href: "/admin/lost-found", label: "Lost & found", icon: PackageSearch, roles: [...ADMINS, "MODERATOR"], group: "Moderation" },
  { href: "/admin/complaints", label: "Complaints", icon: AlertTriangle, roles: [...ADMINS, "MODERATOR"], group: "Moderation" },
  { href: "/admin/users", label: "Users", icon: Users, roles: ADMINS, group: "System" },
  { href: "/admin/audit-log", label: "Audit log", icon: ClipboardList, roles: ADMINS, group: "System" },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ADMINS, group: "System" },
];

/** Navigation visible to `role`. */
export function navFor(role: string): AdminNavItem[] {
  return ADMIN_NAV.filter((item) => item.roles.includes(role as StaffRole));
}

/** UI route guard: true when `role` may open `pathname` (the API enforces the same rules independently). */
export function canOpenRoute(role: string, pathname: string): boolean {
  const entry = ADMIN_NAV.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return entry ? entry.roles.includes(role as StaffRole) : true;
}

export function isAdminRole(role: string | undefined): boolean {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
