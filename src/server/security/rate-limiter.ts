/**
 * Fixed-window rate limiter core. Storage is pluggable: the DB store
 * (src/server/middleware/rate-limit.ts) is shared across serverless instances;
 * the memory store is per-instance and only used for cheap public reads.
 */

export interface RateLimitRule {
  /** Max hits allowed per window. */
  limit: number;
  windowMs: number;
}

export interface WindowState {
  count: number;
  resetAt: Date;
}

export interface RateLimitStore {
  /** Atomically records one hit and returns the window state after it. */
  hit(key: string, windowMs: number, now: Date): Promise<WindowState>;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSeconds: number;
}

/** Records a hit for `key` and decides whether it is within `rule`. */
export async function consume(
  store: RateLimitStore,
  key: string,
  rule: RateLimitRule,
  now: Date = new Date(),
): Promise<RateLimitResult> {
  const state = await store.hit(key, rule.windowMs, now);
  const allowed = state.count <= rule.limit;
  return {
    allowed,
    remaining: Math.max(0, rule.limit - state.count),
    resetAt: state.resetAt,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((state.resetAt.getTime() - now.getTime()) / 1000)),
  };
}

/** Per-instance in-memory store with a bounded key count. */
export class MemoryRateLimitStore implements RateLimitStore {
  private readonly windows = new Map<string, WindowState>();

  constructor(private readonly maxKeys = 10_000) {}

  async hit(key: string, windowMs: number, now: Date): Promise<WindowState> {
    const current = this.windows.get(key);
    const state =
      current && current.resetAt.getTime() > now.getTime()
        ? { count: current.count + 1, resetAt: current.resetAt }
        : { count: 1, resetAt: new Date(now.getTime() + windowMs) };

    if (!current && this.windows.size >= this.maxKeys) this.evictExpired(now);
    this.windows.set(key, state);
    return state;
  }

  private evictExpired(now: Date): void {
    for (const [key, state] of this.windows) {
      if (state.resetAt.getTime() <= now.getTime()) this.windows.delete(key);
    }
    // Still full (all windows live): drop the oldest insertion to stay bounded.
    if (this.windows.size >= this.maxKeys) {
      const oldestKey = this.windows.keys().next().value;
      if (oldestKey !== undefined) this.windows.delete(oldestKey);
    }
  }
}
