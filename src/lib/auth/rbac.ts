import { Role } from "@/generated/prisma/enums";

/**
 * Role-based access control. Pure functions - no DB access - so they can be used
 * from the proxy, route handlers and tests alike. Club-scoped checks (is this
 * CLUB_ADMIN an admin of *this* club?) are done in services on top of these.
 */

/** Roles allowed into the admin console. */
export const STAFF_ROLES: readonly Role[] = [
  Role.MODERATOR,
  Role.CLUB_ADMIN,
  Role.ADMIN,
  Role.SUPER_ADMIN,
];

export const Permission = {
  AdminAccess: "admin:access",
  UsersManage: "users:manage",
  RolesManage: "roles:manage",
  ClubsManage: "clubs:manage",
  EventsManage: "events:manage",
  EventsCheckIn: "events:checkin",
  FormsManage: "forms:manage",
  ResourcesModerate: "resources:moderate",
  NoticesManage: "notices:manage",
  BusesManage: "buses:manage",
  KnowledgeManage: "kb:manage",
  LostFoundModerate: "lostfound:moderate",
  ComplaintsManage: "complaints:manage",
  AuditView: "audit:view",
  ChatAnalyticsView: "chat:analytics",
  AcademicsManage: "academics:manage",
  SettingsManage: "settings:manage",
  CalendarManage: "calendar:manage",
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

const ALL_PERMISSIONS = Object.values(Permission);

const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  [Role.USER]: new Set(),
  [Role.MODERATOR]: new Set([
    Permission.AdminAccess,
    Permission.ResourcesModerate,
    Permission.LostFoundModerate,
    Permission.ComplaintsManage,
    Permission.ChatAnalyticsView,
  ]),
  [Role.CLUB_ADMIN]: new Set([
    Permission.AdminAccess,
    Permission.EventsManage,
    Permission.EventsCheckIn,
    Permission.FormsManage,
  ]),
  [Role.ADMIN]: new Set(
    ALL_PERMISSIONS.filter((permission) => permission !== Permission.RolesManage),
  ),
  [Role.SUPER_ADMIN]: new Set(ALL_PERMISSIONS),
};

export interface RoleHolder {
  role: Role;
}

/** True if the user's role grants the permission. */
export function can(user: RoleHolder | null | undefined, permission: Permission): boolean {
  return user ? ROLE_PERMISSIONS[user.role].has(permission) : false;
}

/** True if the user's role is one of `roles`. */
export function hasRole(user: RoleHolder | null | undefined, roles: readonly Role[]): boolean {
  return user ? roles.includes(user.role) : false;
}

/** True for MODERATOR, CLUB_ADMIN, ADMIN and SUPER_ADMIN. */
export function isStaff(user: RoleHolder | null | undefined): boolean {
  return hasRole(user, STAFF_ROLES);
}
