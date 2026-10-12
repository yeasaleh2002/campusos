import type { Prisma } from "@/generated/prisma/client";
import type { LostFoundStatus } from "@/generated/prisma/enums";
import { can, Permission } from "@/lib/auth/rbac";
import { revalidateLostFound } from "@/lib/cache-tags";
import { AppError, ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import { canSeeContact, canTransition, CLAIM_BLOCKER_MESSAGES, claimBlocker } from "@/server/domain/lost-found";
import { claimReceivedEmail, lostFoundClaimUpdateEmail } from "@/server/email/templates";
import type { AuthUser } from "@/server/middleware/auth";
import { lostFoundCardSelect } from "@/server/queries/lost-found.queries";
import { audit } from "@/server/services/audit.service";
import { sendEmailAfterResponse } from "@/server/services/email.service";
import { notifyUsers } from "@/server/services/notification.service";
import { verifyImageUploads } from "@/server/services/upload.service";
import type { CreateItemInput, ModerateItemInput, UpdateItemInput } from "@/server/validators/lost-found.validators";

const ownItemSelect = { ...lostFoundCardSelect, contactVisible: true, resolvedAt: true, updatedAt: true, _count: { select: { claims: true } } } satisfies Prisma.LostFoundItemSelect;
export type OwnItem = Prisma.LostFoundItemGetPayload<{ select: typeof ownItemSelect }>;

const isModerator = (user: AuthUser) => can(user, Permission.LostFoundModerate);

async function findItem(id: string) {
  const item = await prisma.lostFoundItem.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, title: true, status: true, reporterId: true, contactVisible: true, reporter: { select: { name: true, email: true } } },
  });
  if (!item) throw new NotFoundError("Item not found.");
  return item;
}

/** Reporter or moderator only. */
function assertCanManage(user: AuthUser, item: { reporterId: string }): void {
  if (item.reporterId !== user.id && !isModerator(user)) throw new ForbiddenError();
}

/** Creates a post; photos must come from the caller's own uploads (max 4). */
export async function createItem(user: AuthUser, input: CreateItemInput): Promise<OwnItem> {
  await verifyImageUploads(input.imageUrls, "imageUrls", user.id);
  const item = await prisma.lostFoundItem.create({ data: { ...input, reporterId: user.id }, select: ownItemSelect });
  revalidateLostFound(item.id);
  return item;
}

/** Edits an own post while it is still OPEN. */
export async function updateItem(user: AuthUser, id: string, input: UpdateItemInput): Promise<OwnItem> {
  const item = await findItem(id);
  if (item.reporterId !== user.id) throw new ForbiddenError();
  if (item.status !== "OPEN") throw new ConflictError("Only open posts can be edited.");
  if (input.imageUrls) await verifyImageUploads(input.imageUrls, "imageUrls", user.id);
  const updated = await prisma.lostFoundItem.update({ where: { id }, data: input, select: ownItemSelect });
  revalidateLostFound(id);
  return updated;
}

export async function deleteItem(user: AuthUser, id: string): Promise<void> {
  const item = await findItem(id);
  if (item.reporterId !== user.id) throw new ForbiddenError();
  await prisma.lostFoundItem.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  revalidateLostFound(id);
}

export interface ViewerContext {
  isReporter: boolean;
  myClaim: { id: string; status: string } | null;
  /** The other party's contact - only for the reporter and an approved claimer. */
  contact: { name: string; email: string; phone: string | null } | null;
}

/** Per-viewer extras for the (cached, contact-free) public item page. */
export async function getViewerContext(itemId: string, user: AuthUser | null): Promise<ViewerContext> {
  if (!user) return { isReporter: false, myClaim: null, contact: null };
  const item = await prisma.lostFoundItem.findFirst({
    where: { id: itemId, deletedAt: null },
    select: {
      reporterId: true,
      contactVisible: true,
      reporter: { select: { name: true, email: true, phone: true } },
      claims: { where: { OR: [{ claimerId: user.id }, { status: "APPROVED" }] }, select: { id: true, status: true, claimerId: true, claimer: { select: { name: true, email: true, phone: true } } } },
    },
  });
  if (!item) throw new NotFoundError("Item not found.");

  const approved = item.claims.find((claim) => claim.status === "APPROVED") ?? null;
  const mine = item.claims.find((claim) => claim.claimerId === user.id) ?? null;
  const isReporter = item.reporterId === user.id;
  let contact: ViewerContext["contact"] = null;
  if (isReporter && approved) contact = approved.claimer;
  else if (canSeeContact(item, user.id, approved?.claimerId ?? null) && !isReporter) contact = item.reporter;
  return { isReporter, myClaim: mine ? { id: mine.id, status: mine.status } : null, contact };
}

/** Files (or re-files after a rejection) a claim and notifies the reporter. */
export async function fileClaim(user: AuthUser, itemId: string, message: string) {
  const item = await findItem(itemId);
  if (item.status === "REJECTED") throw new NotFoundError("Item not found.");
  const existing = await prisma.claimRequest.findUnique({ where: { itemId_claimerId: { itemId, claimerId: user.id } }, select: { status: true } });
  const blocker = claimBlocker(item, user.id, existing?.status ?? null);
  if (blocker) throw new AppError(409, blocker, CLAIM_BLOCKER_MESSAGES[blocker]);

  const claim = await prisma.claimRequest.upsert({
    where: { itemId_claimerId: { itemId, claimerId: user.id } },
    create: { itemId, claimerId: user.id, message },
    update: { message, status: "PENDING", reviewedById: null, reviewedAt: null },
    select: { id: true, status: true, createdAt: true },
  });
  await notifyUsers([item.reporterId], { type: "LOST_FOUND", title: `New claim on "${item.title}"`, body: "Review the claim and approve it if the details match.", link: `/lost-found/${itemId}` });
  sendEmailAfterResponse({ email: item.reporter.email, name: item.reporter.name }, () => claimReceivedEmail({ name: item.reporter.name, itemTitle: item.title, itemId }), "lf-claim-received");
  return claim;
}

/** Claims on an item (reporter or moderator). Contact details are never included here. */
export async function listClaims(user: AuthUser, itemId: string) {
  const item = await findItem(itemId);
  assertCanManage(user, item);
  return prisma.claimRequest.findMany({
    where: { itemId },
    select: { id: true, message: true, status: true, createdAt: true, reviewedAt: true, claimer: { select: { id: true, name: true, studentId: true } } },
    orderBy: { createdAt: "asc" },
    take: 200,
  });
}

/**
 * Approves or rejects a pending claim. Approving marks the item CLAIMED and
 * rejects every other pending claim; all affected claimers are notified.
 */
export async function decideClaim(user: AuthUser, itemId: string, claimId: string, decision: "APPROVE" | "REJECT") {
  const item = await findItem(itemId);
  assertCanManage(user, item);
  const claim = await prisma.claimRequest.findFirst({ where: { id: claimId, itemId }, select: { id: true, status: true, claimerId: true } });
  if (!claim) throw new NotFoundError("Claim not found.");
  if (claim.status !== "PENDING") throw new ConflictError("Only pending claims can be decided.");
  if (decision === "APPROVE" && item.status !== "OPEN") throw new ConflictError("This item already has an approved claim.");

  const now = new Date();
  const outcomes: Array<{ claimerId: string; status: "APPROVED" | "REJECTED" }> = [];
  await prisma.$transaction(async (tx) => {
    await tx.claimRequest.update({ where: { id: claimId }, data: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", reviewedById: user.id, reviewedAt: now } });
    outcomes.push({ claimerId: claim.claimerId, status: decision === "APPROVE" ? "APPROVED" : "REJECTED" });
    if (decision === "APPROVE") {
      await tx.lostFoundItem.update({ where: { id: itemId }, data: { status: "CLAIMED" } });
      const others = await tx.claimRequest.findMany({ where: { itemId, status: "PENDING", id: { not: claimId } }, select: { claimerId: true } });
      await tx.claimRequest.updateMany({ where: { itemId, status: "PENDING", id: { not: claimId } }, data: { status: "REJECTED", reviewedById: user.id, reviewedAt: now } });
      outcomes.push(...others.map((other) => ({ claimerId: other.claimerId, status: "REJECTED" as const })));
    }
  });

  const claimers = await prisma.user.findMany({ where: { id: { in: outcomes.map((o) => o.claimerId) } }, select: { id: true, name: true, email: true } });
  for (const outcome of outcomes) {
    const claimer = claimers.find((c) => c.id === outcome.claimerId);
    if (!claimer) continue;
    await notifyUsers([claimer.id], {
      type: "LOST_FOUND",
      title: `Claim ${outcome.status === "APPROVED" ? "approved" : "not approved"}: ${item.title}`,
      body: outcome.status === "APPROVED" ? "Open the post to see how to collect the item." : "The reporter could not verify your claim.",
      link: `/lost-found/${itemId}`,
    });
    sendEmailAfterResponse({ email: claimer.email, name: claimer.name }, () => lostFoundClaimUpdateEmail({ name: claimer.name, itemTitle: item.title, status: outcome.status, itemId }), "lf-claim-update");
  }
  revalidateLostFound(itemId);
  return { claimId, decision, itemStatus: decision === "APPROVE" ? "CLAIMED" : item.status };
}

/** Status change by the reporter (OPEN→RESOLVED, CLAIMED→RESOLVED/OPEN) or a moderator. */
export async function changeStatus(user: AuthUser, itemId: string, status: LostFoundStatus, request: Request) {
  const item = await findItem(itemId);
  assertCanManage(user, item);
  const actor = item.reporterId === user.id && !isModerator(user) ? "reporter" : "moderator";
  if (!canTransition(item.status, status, actor)) throw new ConflictError(`Cannot change status from ${item.status} to ${status}.`);

  await prisma.$transaction(async (tx) => {
    await tx.lostFoundItem.update({
      where: { id: itemId },
      data: { status, ...(status === "RESOLVED" ? { resolvedAt: new Date(), resolvedById: user.id } : { resolvedAt: null, resolvedById: null }) },
    });
    // A claim that fell through: re-open for others.
    if (item.status === "CLAIMED" && status === "OPEN") {
      await tx.claimRequest.updateMany({ where: { itemId, status: "APPROVED" }, data: { status: "REJECTED" } });
    }
  });
  if (actor === "moderator") await audit(user, "lostfound.status", { type: "LostFoundItem", id: itemId }, { from: item.status, to: status }, request);
  revalidateLostFound(itemId);
  return { id: itemId, status };
}

export async function listMyItems(user: AuthUser, query: { status?: LostFoundStatus; cursor?: string; limit: number }): Promise<Page<OwnItem>> {
  const rows = await prisma.lostFoundItem.findMany({
    where: { reporterId: user.id, deletedAt: null, status: query.status },
    select: ownItemSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

// ───────────── Moderation ─────────────

export async function listForModeration(query: { status?: LostFoundStatus; type?: "LOST" | "FOUND"; q?: string; cursor?: string; limit: number }) {
  const rows = await prisma.lostFoundItem.findMany({
    where: {
      deletedAt: null,
      status: query.status,
      type: query.type,
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" } } : {}),
    },
    select: { ...ownItemSelect, reporter: { select: { id: true, name: true, email: true, studentId: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

const MODERATION_STATUS: Record<Exclude<ModerateItemInput["action"], "REMOVE">, LostFoundStatus> = {
  HIDE: "REJECTED",
  RESTORE: "OPEN",
  RESOLVE: "RESOLVED",
};

/** Hide (abusive), restore, resolve or remove (soft delete) a post; the reporter is told why. */
export async function moderateItem(actor: AuthUser, id: string, input: ModerateItemInput, request: Request) {
  const item = await findItem(id);
  if (input.action === "REMOVE") {
    await prisma.lostFoundItem.update({ where: { id }, data: { deletedAt: new Date() } });
  } else {
    const status = MODERATION_STATUS[input.action];
    await prisma.lostFoundItem.update({
      where: { id },
      data: { status, ...(status === "RESOLVED" ? { resolvedAt: new Date(), resolvedById: actor.id } : {}) },
    });
  }
  await audit(actor, `lostfound.${input.action.toLowerCase()}`, { type: "LostFoundItem", id }, { reason: input.reason ?? null }, request);
  if (input.action === "HIDE" || input.action === "REMOVE") {
    await notifyUsers([item.reporterId], { type: "LOST_FOUND", title: `Your post "${item.title}" was ${input.action === "HIDE" ? "hidden" : "removed"}`, body: input.reason ?? "", link: "/my/lost-found" });
  }
  revalidateLostFound(id);
  return { id, action: input.action };
}
