import { env } from "@/lib/env";

/**
 * Reusable, branded, responsive email builder. Table-based layout with inline
 * styles for broad client support (Gmail, Outlook, Apple Mail). Every dynamic
 * string is HTML-escaped here, so templates can never inject markup.
 */

const BRAND = {
  primary: "#4f46e5",
  primaryDark: "#3730a3",
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  surface: "#ffffff",
  background: "#f1f5f9",
  accentBg: "#eef2ff",
  font: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
};

export type EmailBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "code"; code: string; caption?: string }
  | { kind: "button"; label: string; url: string }
  | { kind: "details"; rows: Array<[label: string, value: string]> }
  | { kind: "image"; src: string; alt: string; width: number }
  | { kind: "note"; text: string };

export interface EmailContent {
  subject: string;
  /** Inbox preview text. */
  preheader: string;
  heading: string;
  blocks: EmailBlock[];
}

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

/** Only http(s) links are allowed in emails. */
function safeUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Email links must be http(s).");
  }
  return escapeHtml(parsed.toString());
}

function renderBlock(block: EmailBlock): string {
  switch (block.kind) {
    case "paragraph":
      return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${BRAND.text};white-space:pre-line;">${escapeHtml(block.text)}</p>`;
    case "code":
      return `<div style="margin:8px 0 20px;padding:20px;border-radius:12px;background:${BRAND.accentBg};text-align:center;">
  <div style="font-family:'SFMono-Regular',Consolas,Menlo,monospace;font-size:34px;font-weight:700;letter-spacing:10px;color:${BRAND.primaryDark};">${escapeHtml(block.code)}</div>
  ${block.caption ? `<div style="margin-top:8px;font-size:13px;color:${BRAND.muted};">${escapeHtml(block.caption)}</div>` : ""}
</div>`;
    case "button":
      return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;"><tr><td style="border-radius:10px;background:${BRAND.primary};">
  <a href="${safeUrl(block.url)}" target="_blank" rel="noopener" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${escapeHtml(block.label)}</a>
</td></tr></table>`;
    case "details":
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border:1px solid ${BRAND.border};border-radius:12px;border-collapse:separate;">
${block.rows
  .map(
    ([label, value], index) =>
      `<tr><td style="padding:12px 16px;font-size:13px;color:${BRAND.muted};${index ? `border-top:1px solid ${BRAND.border};` : ""}width:38%;">${escapeHtml(label)}</td><td style="padding:12px 16px;font-size:14px;font-weight:600;color:${BRAND.text};${index ? `border-top:1px solid ${BRAND.border};` : ""}">${escapeHtml(value)}</td></tr>`,
  )
  .join("\n")}
</table>`;
    case "image":
      return `<div style="margin:0 0 20px;text-align:center;"><img src="${safeUrl(block.src)}" alt="${escapeHtml(block.alt)}" width="${block.width}" style="display:inline-block;max-width:100%;height:auto;border:0;border-radius:12px;" /></div>`;
    case "note":
      return `<p style="margin:0 0 16px;padding:12px 14px;border-left:3px solid ${BRAND.primary};background:${BRAND.background};font-size:13px;line-height:20px;color:${BRAND.muted};">${escapeHtml(block.text)}</p>`;
  }
}

function blockToText(block: EmailBlock): string {
  switch (block.kind) {
    case "paragraph":
    case "note":
      return block.text;
    case "code":
      return `${block.code}${block.caption ? `\n${block.caption}` : ""}`;
    case "button":
      return `${block.label}: ${block.url}`;
    case "details":
      return block.rows.map(([label, value]) => `${label}: ${value}`).join("\n");
    case "image":
      return `${block.alt}: ${block.src}`;
  }
}

/** Renders branded HTML + plain-text versions of an email. */
export function renderEmail(content: EmailContent): RenderedEmail {
  const appName = escapeHtml(env.NEXT_PUBLIC_APP_NAME);
  const appUrl = safeUrl(env.NEXT_PUBLIC_APP_URL);
  const year = new Date().getFullYear();

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="light only" />
<title>${escapeHtml(content.subject)}</title>
<style>
  @media (max-width: 620px) {
    .container { width: 100% !important; }
    .card { padding: 28px 20px !important; border-radius: 0 !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${BRAND.background};font-family:${BRAND.font};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background};">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;">
    <tr><td style="padding:0 8px 20px;">
      <a href="${appUrl}" style="text-decoration:none;font-size:20px;font-weight:800;color:${BRAND.primary};letter-spacing:-0.3px;">Campus<span style="color:${BRAND.text};">OS</span></a>
      <span style="font-size:13px;color:${BRAND.muted};">&nbsp;·&nbsp;City University</span>
    </td></tr>
    <tr><td class="card" style="background:${BRAND.surface};border-radius:16px;padding:36px 40px;border:1px solid ${BRAND.border};">
      <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:700;color:${BRAND.text};">${escapeHtml(content.heading)}</h1>
      ${content.blocks.map(renderBlock).join("\n      ")}
    </td></tr>
    <tr><td style="padding:20px 8px;text-align:center;font-size:12px;line-height:18px;color:${BRAND.muted};">
      You received this email because of activity on your ${appName} account.<br />
      &copy; ${year} ${appName}. This is an automated message - please do not reply.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    content.heading,
    "",
    ...content.blocks.map(blockToText).flatMap((line) => [line, ""]),
    `- ${env.NEXT_PUBLIC_APP_NAME}`,
    env.NEXT_PUBLIC_APP_URL,
  ].join("\n");

  return { subject: content.subject, html, text };
}
