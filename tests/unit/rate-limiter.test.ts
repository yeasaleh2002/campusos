import { describe, expect, it } from "vitest";
import { consume, MemoryRateLimitStore } from "@/server/security/rate-limiter";

const rule = { limit: 3, windowMs: 60_000 };
const at = (ms: number) => new Date(Date.UTC(2026, 9, 7) + ms);

describe("consume (fixed window)", () => {
  it("allows up to the limit then blocks with Retry-After", async () => {
    const store = new MemoryRateLimitStore();
    const results = [];
    for (let i = 0; i < 4; i++) results.push(await consume(store, "ip:1", rule, at(i * 1000)));

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[2].remaining).toBe(0);
    expect(results[3].retryAfterSeconds).toBe(57);
  });

  it("resets after the window", async () => {
    const store = new MemoryRateLimitStore();
    for (let i = 0; i < 4; i++) await consume(store, "ip:1", rule, at(0));
    const afterWindow = await consume(store, "ip:1", rule, at(60_000));
    expect(afterWindow.allowed).toBe(true);
    expect(afterWindow.remaining).toBe(2);
  });

  it("isolates keys", async () => {
    const store = new MemoryRateLimitStore();
    for (let i = 0; i < 4; i++) await consume(store, "ip:1", rule, at(0));
    expect((await consume(store, "ip:2", rule, at(0))).allowed).toBe(true);
  });

  it("stays bounded in memory", async () => {
    const store = new MemoryRateLimitStore(10);
    for (let i = 0; i < 50; i++) await consume(store, `ip:${i}`, rule, at(0));
    const internal = (store as unknown as { windows: Map<string, unknown> }).windows;
    expect(internal.size).toBeLessThanOrEqual(10);
  });
});
