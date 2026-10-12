import type { Prisma } from "@/generated/prisma/client";
import type { ComplaintStatus } from "@/generated/prisma/enums";
import { can, Permission } from "@/lib/auth/rbac";
import { revalidateStats } from "@/lib/cache-tags";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import { dhakaYear, formatTicketNo } from "@/server/domain/ticket";
import { complaintReceivedEmail, complaintUpdateEmail } from "@/server/email/templates";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import { sendEmailAfterResponse } from "@/server/services/email.service";
import { notifyUsers } from "@/server/services/notification.service";
import { verifyImageUploads } from "@/server/services/upload.service";
import type { AdminComplaintsQuery, CreateComplaintInput, UpdateComplaintInput } from "@/server/validators/lost-found.validators";

/**
 * Complaints are private: never cached publicly, visible only to the
 * complainant and complaints staff. For anonymous complaints the complainant's
 * identity is hidden from staff too.
 */

const ownComplaintSelect = {
  id: true,
  ticketNo: true,
  category: true,
  subject: true,
  description: true,
  attachmentUrls: true,
  isAnonymous: true,
  status: true,
  priority: true,
  resolvedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ComplaintSelect;

/** Allocates the next per-year sequence atomically (one row-locked upsert). */
async function allocateTicketNo(tx: Prisma.TransactionClient, now: Date): Promise<string> {
  const year = dhakaYear(now);
  const [row] = await tx.$queryRaw<Array<{ lastValue: number }>>`
    INSERT INTO "TicketCounter" ("year", "lastValue", "updatedAt") VALUES (${year}, 1, now())
    ON CONFLICT ("year") DO UPDATE SET "lastValue" = "TicketCounter"."lastValue" + 1, "updatedAt" = now()
    RETURNING "lastValue"`;
  return formatTicketNo(year, row.lastValue);
}

/** Files a complaint with a human-readable ticket and confirms by notification + email. */
export async function createComplaint(user: AuthUser, input: CreateComplaintInput) {
  await verifyImageUploads(input.attachmentUrls, "attachmentUrls", user.id);
  const now = new Date();
  const complaint = await prisma.$transaction(async (tx) => {
    const ticketNo = await allocateTicketNo(tx, now);
    const created = await tx.complaint.create({
      data: { ...input, ticketNo, userId: user.id, priority: input.category === "HARASSMENT" ? "HIGH" : "MEDIUM" },
      select: ownComplaintSelect,
    });
    await tx.complaintUpdate.create({ data: { complaintId: created.id, status: "RECEIVED", note: "Complaint received.", byUserId: user.id } });
    return created;
  });

  await notifyUsers([user.id], { type: "COMPLAINT", title: `Complaint received - ${complaint.ticketNo}`, body: complaint.subject, link: `/complaints/${complaint.ticketNo}` });
  sendEmailAfterResponse({ email: user.email, name: user.name }, () => complaintReceivedEmail({ name: user.name, ticketNo: complaint.ticketNo, subject: complaint.subject }), "complaint-received");
  revalidateStats();
  return complaint;
}

export async function listMyComplaints(user: AuthUser, query: { status?: ComplaintStatus; cursor?: string; limit: number }) {
  const rows = await prisma.complaint.findMany({
    where: { userId: user.id, status: query.status },
    select: { id: true, ticketNo: true, category: true, subject: true, status: true, priority: true, createdAt: true, updatedAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

const publicTimelineSelect = { status: true, note: true, createdAt: true } satisfies Prisma.ComplaintUpdateSelect;

/**
 * Tracks a ticket. The owner (signed in) sees everything except internal notes;
 * with ticket + matching email a limited status view is returned. Any other
 * combination returns the same 404, so tickets can't be enumerated.
 */
export async function trackComplaint(ticketNo: string, user: AuthUser | null, email: string | undefined) {
  const complaint = await prisma.complaint.findUnique({
    where: { ticketNo },
    select: { ...ownComplaintSelect, userId: true, user: { select: { email: true } }, updates: { where: { isInternal: false }, select: publicTimelineSelect, orderBy: { createdAt: "asc" } } },
  });
  if (!complaint) throw new NotFoundError("Ticket not found.");

  const { userId, user: owner, updates, ...details } = complaint;
  if (user && user.id === userId) return { view: "owner" as const, ...details, timeline: updates };
  if (email && email === owner.email) {
    return {
      view: "limited" as const,
      ticketNo: details.ticketNo,
      category: details.category,
      status: details.status,
      createdAt: details.createdAt,
      updatedAt: details.updatedAt,
      resolvedAt: details.resolvedAt,
      timeline: updates.map(({ status, createdAt }) => ({ status, createdAt })),
    };
  }
  throw new NotFoundError("Ticket not found.");
}

// ───────────── Staff ─────────────

const staffComplaintSelect = {
  ...ownComplaintSelect,
  user: { select: { id: true, name: true, email: true, studentId: true } },
  assignedTo: { select: { id: true, name: true } },
} satisfies Prisma.ComplaintSelect;

type StaffComplaintRow = Prisma.ComplaintGetPayload<{ select: typeof staffComplaintSelect }>;

/** Strips the complainant's identity from anonymous complaints. */
const redact = <T extends Pick<StaffComplaintRow, "isAnonymous" | "user">>(row: T) => ({ ...row, user: row.isAnonymous ? null : row.user });

export async function listComplaints(actor: AuthUser, query: AdminComplaintsQuery) {
  const assignee = query.assignee === "me" ? actor.id : query.assignee === "unassigned" ? null : query.assignee;
  const rows = await prisma.complaint.findMany({
    where: {
      status: query.status,
      priority: query.priority,
      category: query.category,
      ...(query.assignee !== undefined ? { assignedToId: assignee } : {}),
      ...(query.q ? { OR: [{ ticketNo: { contains: query.q, mode: "insensitive" } }, { subject: { contains: query.q, mode: "insensitive" } }] } : {}),
    },
    select: staffComplaintSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page: Page<StaffComplaintRow> = toPage(rows, query.limit, (row) => row.id);
  return { ...page, items: page.items.map(redact) };
}

/** Full staff view including internal notes and who wrote each update. */
export async function getComplaintForStaff(id: string) {
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    select: {
      ...staffComplaintSelect,
      updates: { select: { id: true, status: true, note: true, isInternal: true, createdAt: true, byUser: { select: { id: true, name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!complaint) throw new NotFoundError("Complaint not found.");
  const redacted = redact(complaint);
  // Anonymous complainants' own timeline entries must not reveal them either.
  return {
    ...redacted,
    updates: redacted.updates.map((u) => ({ ...u, byUser: complaint.isAnonymous && u.byUser.id === complaint.user.id ? null : u.byUser })),
  };
}

/**
 * Staff update: status / priority / assignee / note. Every change is recorded in
 * the timeline; the complainant is notified (in-app + email) of status changes
 * and public notes, never of internal notes.
 */
export async function updateComplaint(actor: AuthUser, id: string, input: UpdateComplaintInput, request: Request) {
  const current = await prisma.complaint.findUnique({
    where: { id },
    select: { id: true, ticketNo: true, status: true, priority: true, assignedToId: true, user: { select: { id: true, name: true, email: true } } },
  });
  if (!current) throw new NotFoundError("Complaint not found.");

  if (input.assignedToId) {
    const assignee = await prisma.user.findFirst({ where: { id: input.assignedToId, isActive: true, deletedAt: null }, select: { role: true } });
    if (!assignee || !can(assignee, Permission.ComplaintsManage)) {
      throw new ValidationError(undefined, [{ path: "assignedToId", message: "Assignee must be active complaints staff." }]);
    }
  }

  const statusChanged = input.status !== undefined && input.status !== current.status;
  const changes = [
    statusChanged ? `Status → ${input.status}` : null,
    input.priority && input.priority !== current.priority ? `Priority → ${input.priority}` : null,
    input.assignedToId !== undefined && input.assignedToId !== current.assignedToId ? (input.assignedToId ? "Assigned" : "Unassigned") : null,
  ].filter(Boolean);
  const publicNote = input.note && !input.isInternal ? input.note : null;

  await prisma.$transaction([
    prisma.complaint.update({
      where: { id },
      data: {
        status: input.status,
        priority: input.priority,
        assignedToId: input.assignedToId,
        ...(statusChanged ? { resolvedAt: input.status === "RESOLVED" ? new Date() : null } : {}),
      },
    }),
    prisma.complaintUpdate.create({
      data: {
        complaintId: id,
        status: statusChanged ? input.status : null,
        note: input.note ?? changes.join("; "),
        isInternal: input.note ? input.isInternal : !statusChanged,
        byUserId: actor.id,
      },
    }),
  ]);
  await audit(actor, "complaint.update", { type: "Complaint", id }, { changes, internalNote: Boolean(input.note && input.isInternal) }, request);

  if (statusChanged || publicNote) {
    const status = (input.status ?? current.status) as ComplaintStatus;
    await notifyUsers([current.user.id], { type: "COMPLAINT", title: `Update on ${current.ticketNo}`, body: publicNote ?? `Status: ${status}`, link: `/complaints/${current.ticketNo}` });
    sendEmailAfterResponse(current.user, () => complaintUpdateEmail({ name: current.user.name, ticketNo: current.ticketNo, status, note: publicNote }), "complaint-update");
  }
  revalidateStats();
  return getComplaintForStaff(id);
}
