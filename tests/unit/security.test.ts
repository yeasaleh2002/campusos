import { describe, expect, it } from "vitest";
import { escapeHtml } from "@/server/email/layout";
import { getClientIp } from "@/server/security/ip";
import { createFormToken, FORM_TOKEN_MAX_AGE_MS, verifyFormToken } from "@/server/security/form-token";

const NOW = new Date("2026-10-07T10:00:00Z");

describe("form token (minimum time to submit)", () => {
  it("accepts a token older than the minimum age", () => {
    const token = createFormToken(new Date(NOW.getTime() - 5_000));
    expect(verifyFormToken(token, NOW)).toBe("valid");
  });

  it("rejects instant submissions", () => {
    expect(verifyFormToken(createFormToken(NOW), NOW)).toBe("too_fast");
  });

  it("rejects stale tokens", () => {
    const token = createFormToken(new Date(NOW.getTime() - FORM_TOKEN_MAX_AGE_MS - 1));
    expect(verifyFormToken(token, NOW)).toBe("expired");
  });

  it("rejects forged timestamps and garbage", () => {
    const [, signature] = createFormToken(new Date(NOW.getTime() - 5_000)).split(".");
    expect(verifyFormToken(`${NOW.getTime() - 60_000}.${signature}`, NOW)).toBe("bad_signature");
    expect(verifyFormToken(undefined, NOW)).toBe("malformed");
    expect(verifyFormToken("a.b.c", NOW)).toBe("malformed");
  });
});

describe("getClientIp", () => {
  const request = (headers: Record<string, string>) => new Request("http://localhost/api", { headers });

  it("uses the proxy-appended (right-most) X-Forwarded-For entry, ignoring spoofed ones", () => {
    expect(getClientIp(request({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("prefers the Vercel header", () => {
    expect(getClientIp(request({ "x-vercel-forwarded-for": "198.51.100.4", "x-forwarded-for": "6.6.6.6" }))).toBe(
      "198.51.100.4",
    );
  });

  it("rejects non-IP values", () => {
    expect(getClientIp(request({ "x-forwarded-for": "<script>" }))).toBe("unknown");
    expect(getClientIp(request({}))).toBe("unknown");
  });
});

describe("escapeHtml", () => {
  it("neutralises markup in email content", () => {
    expect(escapeHtml(`<img src=x onerror="alert('1')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;1&#39;)&quot;&gt;&amp;",
    );
  });
});
