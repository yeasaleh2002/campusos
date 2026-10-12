import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { env, isProduction } from "@/lib/env";
import type { RenderedEmail } from "@/server/email/layout";

/**
 * Test-only mail hook. When `E2E_MAIL_CAPTURE=1` AND the server is not running
 * in production, outgoing email is appended to `.e2e/mail.jsonl` instead of being
 * sent, so Playwright can read OTP codes. It can never activate in production.
 */
export const mailCaptureEnabled = !isProduction && env.E2E_MAIL_CAPTURE === "1";

const CAPTURE_FILE = path.join(process.cwd(), ".e2e", "mail.jsonl");

export async function captureEmail(to: { email: string; name?: string }, email: RenderedEmail, tag: string): Promise<void> {
  await mkdir(path.dirname(CAPTURE_FILE), { recursive: true });
  const line = JSON.stringify({ at: new Date().toISOString(), to: to.email, tag, subject: email.subject, text: email.text });
  await appendFile(CAPTURE_FILE, `${line}\n`, "utf8");
}
