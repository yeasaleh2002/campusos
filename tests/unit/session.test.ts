import { SignJWT } from "jose";
import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/auth/session";

const claims = { sub: "user_1", role: "USER" as const, tokenVersion: 3 };

describe("signSession / verifySession", () => {
  it("round-trips the claims", async () => {
    const { token, expiresAt } = await signSession(claims);
    expect(await verifySession(token)).toEqual(claims);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(expiresAt.getTime() - Date.now() - sevenDays)).toBeLessThan(5_000);
  });

  it("rejects missing and malformed tokens", async () => {
    expect(await verifySession(undefined)).toBeNull();
    expect(await verifySession("not-a-jwt")).toBeNull();
  });

  it("rejects a tampered payload", async () => {
    const { token } = await signSession(claims);
    const [header, , signature] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...claims, role: "SUPER_ADMIN" })).toString("base64url");
    expect(await verifySession(`${header}.${forged}.${signature}`)).toBeNull();
  });

  it("rejects tokens signed with a different secret", async () => {
    const token = await new SignJWT({ role: "ADMIN", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_1")
      .setIssuer("campusos")
      .setAudience("campusos-web")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("another-secret-another-secret-123456"));
    expect(await verifySession(token)).toBeNull();
  });

  it("rejects expired tokens", async () => {
    const token = await new SignJWT({ role: "USER", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_1")
      .setIssuer("campusos")
      .setAudience("campusos-web")
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    expect(await verifySession(token)).toBeNull();
  });

  it("rejects tokens with an unknown role claim", async () => {
    const token = await new SignJWT({ role: "GOD_MODE", tokenVersion: 0 })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject("user_1")
      .setIssuer("campusos")
      .setAudience("campusos-web")
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode(process.env.JWT_SECRET));
    expect(await verifySession(token)).toBeNull();
  });
});
