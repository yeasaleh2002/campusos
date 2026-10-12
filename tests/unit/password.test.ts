import { describe, expect, it } from "vitest";
import { hashPassword, passwordSchema, verifyPassword } from "@/lib/auth/password";

describe("passwordSchema", () => {
  it.each(["Campus2026", "Str0ngPassword", "CityUni#2026x"])("accepts %s", (password) => {
    expect(passwordSchema.safeParse(password).success).toBe(true);
  });

  it.each([
    ["too short", "Ab1defg"],
    ["no uppercase", "campus2026"],
    ["no lowercase", "CAMPUS2026"],
    ["no number", "CampusPassword"],
    ["too long", `Aa1${"x".repeat(70)}`],
  ])("rejects a password with %s", (_reason, password) => {
    expect(passwordSchema.safeParse(password).success).toBe(false);
  });

  it.each(["Password123", "Password1", "Admin123", "Bangladesh123"])(
    "rejects the common password %s (case-insensitive)",
    (password) => {
      const result = passwordSchema.safeParse(password);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toMatch(/too common/i);
    },
  );
});

describe("hashPassword / verifyPassword", () => {
  it("hashes with bcrypt cost 12 and verifies", async () => {
    const hash = await hashPassword("Campus2026");
    expect(hash).toMatch(/^\$2[aby]\$12\$/);
    expect(await verifyPassword("Campus2026", hash)).toBe(true);
    expect(await verifyPassword("Campus2027", hash)).toBe(false);
  });

  it("returns false (after a dummy compare) when there is no hash", async () => {
    expect(await verifyPassword("Campus2026", null)).toBe(false);
  });
});
