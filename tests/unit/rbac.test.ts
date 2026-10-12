import { describe, expect, it } from "vitest";
import { can, hasRole, isStaff, Permission } from "@/lib/auth/rbac";

const user = (role: "USER" | "MODERATOR" | "CLUB_ADMIN" | "ADMIN" | "SUPER_ADMIN") => ({ role });

describe("isStaff", () => {
  it("excludes students and anonymous users", () => {
    expect(isStaff(user("USER"))).toBe(false);
    expect(isStaff(null)).toBe(false);
  });

  it.each(["MODERATOR", "CLUB_ADMIN", "ADMIN", "SUPER_ADMIN"] as const)("includes %s", (role) => {
    expect(isStaff(user(role))).toBe(true);
  });
});

describe("can", () => {
  it("grants nothing to USER", () => {
    for (const permission of Object.values(Permission)) expect(can(user("USER"), permission)).toBe(false);
  });

  it("grants everything to SUPER_ADMIN", () => {
    for (const permission of Object.values(Permission)) expect(can(user("SUPER_ADMIN"), permission)).toBe(true);
  });

  it("reserves role management for SUPER_ADMIN", () => {
    expect(can(user("ADMIN"), Permission.RolesManage)).toBe(false);
    expect(can(user("ADMIN"), Permission.UsersManage)).toBe(true);
  });

  it("scopes CLUB_ADMIN to events and forms", () => {
    expect(can(user("CLUB_ADMIN"), Permission.EventsManage)).toBe(true);
    expect(can(user("CLUB_ADMIN"), Permission.FormsManage)).toBe(true);
    expect(can(user("CLUB_ADMIN"), Permission.ResourcesModerate)).toBe(false);
    expect(can(user("CLUB_ADMIN"), Permission.UsersManage)).toBe(false);
  });

  it("lets MODERATOR moderate but not manage events", () => {
    expect(can(user("MODERATOR"), Permission.ResourcesModerate)).toBe(true);
    expect(can(user("MODERATOR"), Permission.LostFoundModerate)).toBe(true);
    expect(can(user("MODERATOR"), Permission.EventsManage)).toBe(false);
  });

  it("denies anonymous users", () => {
    expect(can(null, Permission.AdminAccess)).toBe(false);
  });
});

describe("hasRole", () => {
  it("matches only listed roles", () => {
    expect(hasRole(user("ADMIN"), ["ADMIN", "SUPER_ADMIN"])).toBe(true);
    expect(hasRole(user("MODERATOR"), ["ADMIN", "SUPER_ADMIN"])).toBe(false);
  });
});
