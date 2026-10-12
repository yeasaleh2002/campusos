import { isIP } from "node:net";

/**
 * Number of reverse proxies in front of the app that append to X-Forwarded-For.
 * Vercel (and most single-proxy setups) = 1. Entries left of the trusted hops are
 * client-supplied and therefore spoofable, so they are ignored.
 */
const TRUSTED_PROXY_HOPS = 1;

const UNKNOWN_IP = "unknown";

function normalise(candidate: string | null | undefined): string | null {
  const value = candidate?.trim();
  return value && isIP(value) ? value : null;
}

/** Best-effort client IP that cannot be spoofed past the trusted proxy chain. */
export function getClientIp(request: Request): string {
  const vercelIp = normalise(request.headers.get("x-vercel-forwarded-for")?.split(",")[0]);
  if (vercelIp) return vercelIp;

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",");
    const trusted = normalise(hops[Math.max(0, hops.length - TRUSTED_PROXY_HOPS)]);
    if (trusted) return trusted;
  }

  return normalise(request.headers.get("x-real-ip")) ?? UNKNOWN_IP;
}
