import type { ClaimStatus, LostFoundStatus } from "@/generated/prisma/enums";

/**
 * Lost & Found rules (pure).
 *
 *   OPEN ──claim approved──► CLAIMED ──handed over──► RESOLVED
 *     │                        │
 *     └──── found it myself ───┴──► RESOLVED       CLAIMED ──claim fell through──► OPEN
 *
 * REJECTED is a moderation-only state (hidden abusive post).
 */

const REPORTER_TRANSITIONS: Record<LostFoundStatus, LostFoundStatus[]> = {
  OPEN: ["RESOLVED"],
  CLAIMED: ["RESOLVED", "OPEN"],
  RESOLVED: [],
  REJECTED: [],
};

const MODERATOR_TRANSITIONS: Record<LostFoundStatus, LostFoundStatus[]> = {
  OPEN: ["CLAIMED", "RESOLVED", "REJECTED"],
  CLAIMED: ["OPEN", "RESOLVED", "REJECTED"],
  RESOLVED: ["OPEN", "REJECTED"],
  REJECTED: ["OPEN"],
};

/** Whether the actor may move an item between statuses (CLAIMED is reached by approving a claim). */
export function canTransition(from: LostFoundStatus, to: LostFoundStatus, actor: "reporter" | "moderator"): boolean {
  const table = actor === "moderator" ? MODERATOR_TRANSITIONS : REPORTER_TRANSITIONS;
  return table[from].includes(to);
}

export type ClaimBlocker = "OWN_ITEM" | "ITEM_NOT_OPEN" | "ALREADY_CLAIMED";

/** Why `claimerId` cannot file a claim on the item, or null if they can. */
export function claimBlocker(
  item: { reporterId: string; status: LostFoundStatus },
  claimerId: string,
  existingClaimStatus: ClaimStatus | null,
): ClaimBlocker | null {
  if (item.reporterId === claimerId) return "OWN_ITEM";
  if (item.status !== "OPEN") return "ITEM_NOT_OPEN";
  if (existingClaimStatus === "PENDING" || existingClaimStatus === "APPROVED") return "ALREADY_CLAIMED";
  return null;
}

export const CLAIM_BLOCKER_MESSAGES: Record<ClaimBlocker, string> = {
  OWN_ITEM: "You can't claim your own post.",
  ITEM_NOT_OPEN: "This item is no longer open for claims.",
  ALREADY_CLAIMED: "You already have a claim on this item.",
};

/** Whether contact details may be shown to `viewerId` (never public). */
export function canSeeContact(
  item: { reporterId: string; contactVisible: boolean },
  viewerId: string | null,
  approvedClaimerId: string | null,
): boolean {
  if (!viewerId) return false;
  if (viewerId === item.reporterId) return true;
  return item.contactVisible && viewerId === approvedClaimerId;
}

export interface MatchSignals {
  sameCategory: boolean;
  /** pg_trgm similarity of the two posts' text, 0..1 */
  textSimilarity: number;
  /** Days between the two occurrences. */
  daysApart: number;
}

const DATE_WINDOW_DAYS = 30;

/** Likelihood (0..1) that a LOST and a FOUND post describe the same item. */
export function matchScore(signals: MatchSignals): number {
  const recency = Math.max(0, 1 - Math.abs(signals.daysApart) / DATE_WINDOW_DAYS);
  const score = 0.35 * (signals.sameCategory ? 1 : 0) + 0.45 * Math.min(1, signals.textSimilarity) + 0.2 * recency;
  return Number(score.toFixed(4));
}
