import type { BadgeTone } from "@/components/ui/badge";

/** Human labels + badge tones for API enums (single source for every page). */

type LabelMap<K extends string> = Record<K, { label: string; tone: BadgeTone }>;

export const EVENT_TYPE: LabelMap<"WORKSHOP" | "CONTEST" | "SEMINAR" | "CULTURAL" | "SPORTS" | "MEETUP" | "OTHER"> = {
  WORKSHOP: { label: "Workshop", tone: "primary" },
  CONTEST: { label: "Contest", tone: "saffron" },
  SEMINAR: { label: "Seminar", tone: "info" },
  CULTURAL: { label: "Cultural", tone: "accent" },
  SPORTS: { label: "Sports", tone: "success" },
  MEETUP: { label: "Meetup", tone: "neutral" },
  OTHER: { label: "Other", tone: "neutral" },
};

export const EVENT_STATUS: LabelMap<"DRAFT" | "PUBLISHED" | "CANCELLED" | "COMPLETED"> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  PUBLISHED: { label: "Open", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "danger" },
  COMPLETED: { label: "Completed", tone: "neutral" },
};

export const REGISTRATION_STATUS: LabelMap<"REGISTERED" | "CHECKED_IN" | "CANCELLED"> = {
  REGISTERED: { label: "Registered", tone: "primary" },
  CHECKED_IN: { label: "Checked in", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
};

export const CLUB_CATEGORY: LabelMap<"TECHNOLOGY" | "ACADEMIC" | "CULTURAL" | "SPORTS" | "ARTS" | "DEBATE" | "SOCIAL_SERVICE" | "OTHER"> = {
  TECHNOLOGY: { label: "Technology", tone: "primary" },
  ACADEMIC: { label: "Academic", tone: "info" },
  CULTURAL: { label: "Cultural", tone: "accent" },
  SPORTS: { label: "Sports", tone: "success" },
  ARTS: { label: "Arts", tone: "saffron" },
  DEBATE: { label: "Debate", tone: "warning" },
  SOCIAL_SERVICE: { label: "Social service", tone: "accent" },
  OTHER: { label: "Other", tone: "neutral" },
};

export const RESOURCE_TYPE: LabelMap<"NOTES" | "QUESTION_PAPER" | "LAB_MANUAL" | "NOTICE" | "OTHER"> = {
  NOTES: { label: "Notes", tone: "primary" },
  QUESTION_PAPER: { label: "Previous questions", tone: "saffron" },
  LAB_MANUAL: { label: "Lab manual", tone: "accent" },
  NOTICE: { label: "Notice", tone: "info" },
  OTHER: { label: "Other", tone: "neutral" },
};

export const MODERATION_STATUS: LabelMap<"PENDING" | "APPROVED" | "REJECTED"> = {
  PENDING: { label: "Pending review", tone: "warning" },
  APPROVED: { label: "Published", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const KB_CATEGORY: LabelMap<"BUS" | "RULES" | "EXAM" | "ADMISSION" | "GENERAL" | "FAQ"> = {
  BUS: { label: "Bus & transport", tone: "accent" },
  RULES: { label: "Rules & policy", tone: "info" },
  EXAM: { label: "Exams", tone: "saffron" },
  ADMISSION: { label: "Admission", tone: "primary" },
  GENERAL: { label: "General", tone: "neutral" },
  FAQ: { label: "FAQ", tone: "neutral" },
};

export const NOTICE_CATEGORY: LabelMap<"CLASS_CANCELLATION" | "EXAM" | "GENERAL" | "URGENT" | "FORM_DEADLINE"> = {
  CLASS_CANCELLATION: { label: "Class cancelled", tone: "danger" },
  EXAM: { label: "Exam", tone: "saffron" },
  GENERAL: { label: "General", tone: "neutral" },
  URGENT: { label: "Urgent", tone: "danger" },
  FORM_DEADLINE: { label: "Form deadline", tone: "info" },
};

export const LOST_FOUND_TYPE: LabelMap<"LOST" | "FOUND"> = {
  LOST: { label: "Lost", tone: "danger" },
  FOUND: { label: "Found", tone: "success" },
};

export const LOST_FOUND_CATEGORY: LabelMap<"ELECTRONICS" | "ID_CARD" | "DOCUMENTS" | "BOOKS" | "WALLET" | "KEYS" | "BAG" | "CLOTHING" | "ACCESSORIES" | "OTHER"> = {
  ELECTRONICS: { label: "Electronics", tone: "primary" },
  ID_CARD: { label: "ID card", tone: "saffron" },
  DOCUMENTS: { label: "Documents", tone: "info" },
  BOOKS: { label: "Books", tone: "accent" },
  WALLET: { label: "Wallet", tone: "warning" },
  KEYS: { label: "Keys", tone: "neutral" },
  BAG: { label: "Bag", tone: "neutral" },
  CLOTHING: { label: "Clothing", tone: "neutral" },
  ACCESSORIES: { label: "Accessories", tone: "neutral" },
  OTHER: { label: "Other", tone: "neutral" },
};

export const LOST_FOUND_STATUS: LabelMap<"OPEN" | "CLAIMED" | "RESOLVED" | "REJECTED"> = {
  OPEN: { label: "Open", tone: "info" },
  CLAIMED: { label: "Claim pending", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  REJECTED: { label: "Removed", tone: "neutral" },
};

export const CLAIM_STATUS: LabelMap<"PENDING" | "APPROVED" | "REJECTED"> = {
  PENDING: { label: "Pending", tone: "warning" },
  APPROVED: { label: "Approved", tone: "success" },
  REJECTED: { label: "Rejected", tone: "danger" },
};

export const COMPLAINT_CATEGORY: LabelMap<"ACADEMIC" | "ADMINISTRATIVE" | "FACILITIES" | "TRANSPORT" | "IT_SERVICES" | "FINANCE" | "HARASSMENT" | "OTHER"> = {
  ACADEMIC: { label: "Academic", tone: "primary" },
  ADMINISTRATIVE: { label: "Administrative", tone: "info" },
  FACILITIES: { label: "Facilities", tone: "accent" },
  TRANSPORT: { label: "Transport", tone: "accent" },
  IT_SERVICES: { label: "IT services", tone: "info" },
  FINANCE: { label: "Finance", tone: "saffron" },
  HARASSMENT: { label: "Harassment", tone: "danger" },
  OTHER: { label: "Other", tone: "neutral" },
};

export const COMPLAINT_STATUS: LabelMap<"RECEIVED" | "IN_REVIEW" | "RESOLVED" | "REJECTED"> = {
  RECEIVED: { label: "Received", tone: "info" },
  IN_REVIEW: { label: "In review", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  REJECTED: { label: "Closed", tone: "neutral" },
};

export const COMPLAINT_PRIORITY: LabelMap<"LOW" | "MEDIUM" | "HIGH" | "URGENT"> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  URGENT: { label: "Urgent", tone: "danger" },
};

/** Safe lookup for values that might be outside the map (new enum members). */
export function labelOf<K extends string>(map: LabelMap<K>, key: string): { label: string; tone: BadgeTone } {
  return (map as Record<string, { label: string; tone: BadgeTone }>)[key] ?? { label: key.replaceAll("_", " ").toLowerCase(), tone: "neutral" };
}

export function optionsOf<K extends string>(map: LabelMap<K>): Array<{ value: K; label: string }> {
  return (Object.keys(map) as K[]).map((value) => ({ value, label: map[value].label }));
}
