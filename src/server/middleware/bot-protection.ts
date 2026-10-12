import { z } from "zod";
import { env } from "@/lib/env";
import { BadRequestError, ForbiddenError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { verifyFormToken } from "@/server/security/form-token";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const TURNSTILE_TIMEOUT_MS = 5_000;

/**
 * Anti-bot fields accepted by public forms. Spread into a form's strict schema:
 * `z.object({ ...botFieldsShape, email: ... }).strict()`.
 * - `website`: honeypot, hidden from humans; must stay empty.
 * - `formToken`: signed render timestamp from GET /api/security/form-token.
 * - `turnstileToken`: Cloudflare Turnstile response (only checked if configured).
 */
export const botFieldsShape = {
  website: z.string().max(200).optional(),
  formToken: z.string().max(200).optional(),
  turnstileToken: z.string().max(4096).optional(),
};

export interface BotFields {
  website?: string;
  formToken?: string;
  turnstileToken?: string;
}

/** True when the honeypot was filled. Callers must respond with a fake success. */
export function isHoneypotTriggered(fields: BotFields): boolean {
  return Boolean(fields.website?.trim());
}

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) return true;
  if (!token) return false;
  try {
    const body = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token });
    if (ip !== "unknown") body.set("remoteip", ip);
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    });
    const result = (await response.json()) as { success?: boolean };
    return result.success === true;
  } catch (error) {
    logger.warn("Turnstile verification failed", { error });
    return false;
  }
}

interface HumanCheckOptions {
  /** Require a valid minimum-time-to-submit token. */
  requireFormToken: boolean;
}

/**
 * Throws if the request looks automated: bad/fast form token or failed Turnstile
 * (Turnstile is enforced only when TURNSTILE_SECRET_KEY is set).
 * Check `isHoneypotTriggered` first - honeypot hits must be answered silently.
 */
export async function assertHuman(
  fields: BotFields,
  ip: string,
  options: HumanCheckOptions,
): Promise<void> {
  if (options.requireFormToken) {
    const tokenResult = verifyFormToken(fields.formToken);
    if (tokenResult === "too_fast") {
      throw new BadRequestError("Form submitted too quickly. Please try again.");
    }
    if (tokenResult !== "valid") {
      throw new BadRequestError("Form session expired. Please reload the page and try again.");
    }
  }
  if (!(await verifyTurnstile(fields.turnstileToken, ip))) {
    throw new ForbiddenError("Bot verification failed. Please try again.");
  }
}
