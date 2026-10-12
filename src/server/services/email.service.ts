import { after } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { RenderedEmail } from "@/server/email/layout";
import { captureEmail, mailCaptureEnabled } from "@/server/services/mail-capture";

const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 400;
/** Recipients per Brevo request when fanning out the same email (messageVersions). */
const BULK_CHUNK = 500;

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  name: string;
  /** Base64-encoded file content. */
  content: string;
}

export interface SendEmailOptions {
  attachments?: EmailAttachment[];
}

export type SendEmailResult = { ok: true; messageId?: string } | { ok: false; reason: string };

/** Network errors and 429/5xx are transient; other 4xx (bad payload/key) are not. */
function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const recipient = (to: EmailRecipient) => ({ email: to.email, ...(to.name ? { name: to.name } : {}) });

function basePayload(email: RenderedEmail, tag: string) {
  return {
    sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
    subject: email.subject,
    htmlContent: email.html,
    textContent: email.text,
    tags: [tag],
  };
}

/** POSTs to Brevo with timeout and one retry on transient failures. Never throws. */
async function postToBrevo(payload: string, tag: string): Promise<SendEmailResult> {
  let reason = "unknown";
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(BREVO_ENDPOINT, {
        method: "POST",
        headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
        body: payload,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as { messageId?: string };
        return { ok: true, messageId: body.messageId };
      }
      // Brevo's error text (e.g. "unrecognised IP address") says why; it never echoes the email body.
      const failure = (await response.json().catch(() => ({}))) as { message?: string };
      reason = `brevo_status_${response.status}${failure.message ? `: ${failure.message.slice(0, 200)}` : ""}`;
      if (!isRetryableStatus(response.status)) break;
    } catch (error) {
      reason = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "network_error";
    }
    if (attempt < MAX_ATTEMPTS) await delay(RETRY_DELAY_MS * attempt);
  }
  // Never log the body: it may contain an OTP.
  logger.error("Email delivery failed", { tag, reason });
  return { ok: false, reason };
}

/**
 * Sends a transactional email through Brevo. Never throws: failures are logged
 * and returned as `{ ok: false }` so callers can respond safely.
 *
 * Retry-safety: callers only send content that is safe to deliver twice
 * (a re-sent OTP supersedes the previous one).
 */
export function sendEmail(
  to: EmailRecipient,
  email: RenderedEmail,
  tag: string,
  options: SendEmailOptions = {},
): Promise<SendEmailResult> {
  if (mailCaptureEnabled) {
    return captureEmail(to, email, tag).then(() => ({ ok: true as const }));
  }
  const payload = {
    ...basePayload(email, tag),
    to: [recipient(to)],
    ...(options.attachments?.length ? { attachment: options.attachments } : {}),
  };
  return postToBrevo(JSON.stringify(payload), tag);
}

/**
 * Sends the same email to many recipients, chunked (one Brevo request per 500
 * recipients via `messageVersions`, each recipient receives an individual copy).
 * Returns how many recipients were accepted.
 */
export async function sendBulkEmail(recipients: readonly EmailRecipient[], email: RenderedEmail, tag: string): Promise<number> {
  let accepted = 0;
  for (let offset = 0; offset < recipients.length; offset += BULK_CHUNK) {
    const chunk = recipients.slice(offset, offset + BULK_CHUNK);
    const payload = { ...basePayload(email, tag), messageVersions: chunk.map((to) => ({ to: [recipient(to)] })) };
    const result = await postToBrevo(JSON.stringify(payload), tag);
    if (result.ok) accepted += chunk.length;
  }
  return accepted;
}

/**
 * Sends a non-critical notification (welcome, password changed...) after the
 * response has been flushed, so it adds no latency and cannot fail the request.
 * Only callable from Route Handlers / Server Actions.
 */
export function sendEmailAfterResponse(
  to: EmailRecipient,
  render: () => RenderedEmail | Promise<RenderedEmail>,
  tag: string,
  buildOptions?: () => Promise<SendEmailOptions>,
): void {
  after(async () => {
    const [email, options] = await Promise.all([render(), buildOptions?.() ?? Promise.resolve({})]);
    await sendEmail(to, email, tag, options);
  });
}
