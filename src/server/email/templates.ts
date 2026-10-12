import { env } from "@/lib/env";
import { renderEmail, type RenderedEmail } from "@/server/email/layout";

/** All transactional email templates. Each returns subject + HTML + text. */

const appUrl = (path: string) => new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
const DHAKA_DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Dhaka",
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
/** Campus-local time regardless of the server timezone. */
const formatDateTime = (date: Date) => `${DHAKA_DATE_TIME.format(date)} (BST)`;

export function otpVerificationEmail(input: { name: string; code: string; ttlMinutes: number }): RenderedEmail {
  return renderEmail({
    subject: `${input.code} is your CampusOS verification code`,
    preheader: `Your verification code expires in ${input.ttlMinutes} minutes.`,
    heading: "Verify your email",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, welcome to CampusOS! Enter this code to verify your email address:` },
      { kind: "code", code: input.code, caption: `Expires in ${input.ttlMinutes} minutes` },
      { kind: "note", text: "If you didn't create a CampusOS account, you can safely ignore this email." },
    ],
  });
}

export function passwordResetEmail(input: { name: string; code: string; ttlMinutes: number }): RenderedEmail {
  return renderEmail({
    subject: `${input.code} is your CampusOS password reset code`,
    preheader: "Use this code to reset your password.",
    heading: "Reset your password",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, we received a request to reset your password. Use this code:` },
      { kind: "code", code: input.code, caption: `Expires in ${input.ttlMinutes} minutes` },
      { kind: "note", text: "Didn't request this? Ignore this email - your password stays unchanged." },
    ],
  });
}

export function welcomeEmail(input: { name: string }): RenderedEmail {
  return renderEmail({
    subject: "Welcome to CampusOS 🎓",
    preheader: "Your account is verified. Here's what you can do.",
    heading: `Welcome aboard, ${input.name}!`,
    blocks: [
      { kind: "paragraph", text: "Your email is verified and your CampusOS account is ready. Everything at City University, in one place:" },
      { kind: "paragraph", text: "• Discover and register for club events with QR tickets\n• Find notes and previous question papers\n• Check notices and bus schedules\n• Report lost items and track complaints" },
      { kind: "button", label: "Open CampusOS", url: appUrl("/dashboard") },
    ],
  });
}

export function passwordChangedEmail(input: { name: string; changedAt: Date }): RenderedEmail {
  return renderEmail({
    subject: "Your CampusOS password was changed",
    preheader: "Security notice for your account.",
    heading: "Password changed",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, the password for your CampusOS account was changed on ${formatDateTime(input.changedAt)}. You have been signed out on all other devices.` },
      { kind: "note", text: "If this wasn't you, reset your password immediately and contact the CampusOS admin team." },
      { kind: "button", label: "Reset password", url: appUrl("/forgot-password") },
    ],
  });
}

export function eventRegistrationEmail(input: {
  name: string;
  eventTitle: string;
  startAt: Date;
  venue: string;
  bannerUrl: string | null;
  ticketUrl: string;
}): RenderedEmail {
  return renderEmail({
    subject: `You're registered: ${input.eventTitle}`,
    preheader: `Your QR ticket for ${input.eventTitle} is attached.`,
    heading: "You're in! 🎉",
    blocks: [
      ...(input.bannerUrl ? [{ kind: "image" as const, src: input.bannerUrl, alt: input.eventTitle, width: 520 }] : []),
      { kind: "paragraph", text: `Hi ${input.name}, your registration is confirmed. Your QR ticket is attached to this email - show it at the entrance for check-in.` },
      { kind: "details", rows: [["Event", input.eventTitle], ["When", formatDateTime(input.startAt)], ["Venue", input.venue]] },
      { kind: "button", label: "View ticket", url: input.ticketUrl },
      { kind: "note", text: "Can't make it? Cancel from your dashboard so someone else can take your seat." },
    ],
  });
}

export function eventCancelledEmail(input: { eventTitle: string; startAt: Date; reason: string }): RenderedEmail {
  return renderEmail({
    subject: `Cancelled: ${input.eventTitle}`,
    preheader: `${input.eventTitle} has been cancelled.`,
    heading: "Event cancelled",
    blocks: [
      { kind: "paragraph", text: `We're sorry - "${input.eventTitle}", scheduled for ${formatDateTime(input.startAt)}, has been cancelled by the organisers.` },
      { kind: "details", rows: [["Reason", input.reason]] },
      { kind: "button", label: "Browse other events", url: appUrl("/events") },
    ],
  });
}

export function eventUpdatedEmail(input: {
  eventTitle: string;
  eventSlug: string;
  startAt: Date;
  endAt: Date;
  venue: string;
}): RenderedEmail {
  return renderEmail({
    subject: `Updated: ${input.eventTitle}`,
    preheader: "The schedule or venue of an event you registered for has changed.",
    heading: "Event details changed",
    blocks: [
      { kind: "paragraph", text: `The organisers updated "${input.eventTitle}". Your registration is still valid - here are the latest details:` },
      { kind: "details", rows: [["Starts", formatDateTime(input.startAt)], ["Ends", formatDateTime(input.endAt)], ["Venue", input.venue]] },
      { kind: "button", label: "View event", url: appUrl(`/events/${encodeURIComponent(input.eventSlug)}`) },
    ],
  });
}

export function resourceReviewedEmail(input: {
  name: string;
  resourceTitle: string;
  approved: boolean;
  reason: string | null;
  resourceId: string;
}): RenderedEmail {
  return renderEmail({
    subject: input.approved ? `Approved: ${input.resourceTitle}` : `Not approved: ${input.resourceTitle}`,
    preheader: input.approved ? "Your resource is now live." : "Your resource needs changes.",
    heading: input.approved ? "Your resource is live 🎉" : "Your resource was not approved",
    blocks: [
      { kind: "paragraph", text: input.approved
        ? `Hi ${input.name}, thanks for sharing! "${input.resourceTitle}" is now visible to every student in the Resource Hub.`
        : `Hi ${input.name}, a moderator reviewed "${input.resourceTitle}" and could not publish it.` },
      ...(input.reason ? [{ kind: "details" as const, rows: [["Moderator note", input.reason]] as Array<[string, string]> }] : []),
      { kind: "button", label: input.approved ? "View resource" : "My uploads", url: appUrl(input.approved ? `/resources/${encodeURIComponent(input.resourceId)}` : "/my/resources") },
    ],
  });
}

export function complaintReceivedEmail(input: { name: string; ticketNo: string; subject: string }): RenderedEmail {
  return renderEmail({
    subject: `Complaint received - ${input.ticketNo}`,
    preheader: `We've logged your complaint as ${input.ticketNo}.`,
    heading: "We've received your complaint",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, thank you for reaching out. Your complaint has been logged and will be reviewed by the responsible office.` },
      { kind: "details", rows: [["Ticket", input.ticketNo], ["Subject", input.subject], ["Status", "Received"]] },
      { kind: "button", label: "Track your complaint", url: appUrl(`/complaints/${encodeURIComponent(input.ticketNo)}`) },
    ],
  });
}

const COMPLAINT_STATUS_LABEL = {
  RECEIVED: "Received",
  IN_REVIEW: "In review",
  RESOLVED: "Resolved",
  REJECTED: "Closed - not actionable",
} as const;

export function complaintUpdateEmail(input: {
  name: string;
  ticketNo: string;
  status: keyof typeof COMPLAINT_STATUS_LABEL;
  note: string | null;
}): RenderedEmail {
  return renderEmail({
    subject: `Update on ${input.ticketNo}: ${COMPLAINT_STATUS_LABEL[input.status]}`,
    preheader: `Your complaint ${input.ticketNo} has an update.`,
    heading: "Your complaint was updated",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, there is an update on your complaint.` },
      { kind: "details", rows: [["Ticket", input.ticketNo], ["Status", COMPLAINT_STATUS_LABEL[input.status]]] },
      ...(input.note ? [{ kind: "paragraph" as const, text: input.note }] : []),
      { kind: "button", label: "Track your complaint", url: appUrl(`/complaints/${encodeURIComponent(input.ticketNo)}`) },
    ],
  });
}

export function claimReceivedEmail(input: { name: string; itemTitle: string; itemId: string }): RenderedEmail {
  return renderEmail({
    subject: `New claim on "${input.itemTitle}"`,
    preheader: "Someone responded to your Lost & Found post.",
    heading: "Someone responded to your post",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name}, a student submitted a claim on "${input.itemTitle}". Review their message and approve it only if the details match.` },
      { kind: "note", text: "Never share passwords or pay money to get an item back. Meet in a public place on campus or at the admin office." },
      { kind: "button", label: "Review claim", url: appUrl(`/lost-found/${encodeURIComponent(input.itemId)}`) },
    ],
  });
}

export function eventReminderEmail(input: { eventTitle: string; eventSlug: string; startAt: Date; venue: string }): RenderedEmail {
  return renderEmail({
    subject: `Tomorrow: ${input.eventTitle}`,
    preheader: `${input.eventTitle} starts tomorrow.`,
    heading: "See you tomorrow! ⏰",
    blocks: [
      { kind: "paragraph", text: `A reminder that "${input.eventTitle}" starts tomorrow. Keep your QR ticket ready for check-in.` },
      { kind: "details", rows: [["When", formatDateTime(input.startAt)], ["Venue", input.venue]] },
      { kind: "button", label: "View event", url: appUrl(`/events/${encodeURIComponent(input.eventSlug)}`) },
    ],
  });
}

const CLAIM_STATUS_COPY = {
  APPROVED: "Your claim was approved. Please collect the item from the admin office with your student ID.",
  REJECTED: "Your claim could not be verified. If you believe this is a mistake, contact the admin office.",
  PENDING: "Your claim is pending review. We'll notify you once it's verified.",
} as const;

export function lostFoundClaimUpdateEmail(input: {
  name: string;
  itemTitle: string;
  status: keyof typeof CLAIM_STATUS_COPY;
  itemId: string;
}): RenderedEmail {
  return renderEmail({
    subject: `Claim update: ${input.itemTitle}`,
    preheader: `Your claim is now ${input.status.toLowerCase()}.`,
    heading: "Lost & Found claim update",
    blocks: [
      { kind: "paragraph", text: `Hi ${input.name},` },
      { kind: "details", rows: [["Item", input.itemTitle], ["Status", input.status]] },
      { kind: "paragraph", text: CLAIM_STATUS_COPY[input.status] },
      { kind: "button", label: "View item", url: appUrl(`/lost-found/${encodeURIComponent(input.itemId)}`) },
    ],
  });
}
