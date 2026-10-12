import { nanoid } from "nanoid";
import QRCode from "qrcode";
import { Prisma } from "@/generated/prisma/client";
import type { RegistrationStatus } from "@/generated/prisma/enums";
import { revalidateEventDetail } from "@/lib/cache-tags";
import { csvRow } from "@/lib/csv";
import { env } from "@/lib/env";
import { AppError, ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import { CHECKIN_ERROR_DETAILS, decideCheckIn } from "@/server/domain/checkin";
import { REGISTRATION_BLOCKER_MESSAGES, type RegistrationBlocker, registrationBlocker } from "@/server/domain/event-registration";
import { eventRegistrationEmail } from "@/server/email/templates";
import type { AuthUser } from "@/server/middleware/auth";
import { eventCardSelect } from "@/server/queries/event.queries";
import { audit } from "@/server/services/audit.service";
import { assertClubAccess } from "@/server/services/club-access.service";
import { sendEmailAfterResponse } from "@/server/services/email.service";
import { notifyUsers } from "@/server/services/notification.service";

const QR_TOKEN_LENGTH = 32;

const BLOCKER_STATUS: Record<RegistrationBlocker, number> = {
  EVENT_NOT_OPEN: 409,
  EVENT_ENDED: 409,
  REGISTRATION_CLOSED: 409,
  ALREADY_REGISTERED: 409,
  EVENT_FULL: 409,
};

const blockerError = (blocker: RegistrationBlocker) =>
  new AppError(BLOCKER_STATUS[blocker], blocker, REGISTRATION_BLOCKER_MESSAGES[blocker]);

/** Thrown inside the transaction to roll back the seat claim. */
class RegistrationAbort extends Error {
  constructor(readonly blocker: RegistrationBlocker) {
    super(blocker);
  }
}

const myRegistrationSelect = {
  id: true,
  status: true,
  checkedInAt: true,
  createdAt: true,
  event: { select: eventCardSelect },
} satisfies Prisma.EventRegistrationSelect;

export type MyRegistration = Prisma.EventRegistrationGetPayload<{ select: typeof myRegistrationSelect }>;

/**
 * Registers the user for an event.
 *
 * Concurrency safety: the seat is claimed with ONE conditional UPDATE
 * (`registrationCount < capacity`), which Postgres executes under a row lock, so
 * two requests can never take the last seat twice. The registration row is
 * written in the same transaction; any failure (duplicate, race) rolls the
 * counter back.
 */
export async function registerForEvent(user: AuthUser, eventId: string): Promise<MyRegistration> {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { id: true, title: true, slug: true, status: true, startAt: true, endAt: true, venue: true, bannerUrl: true, registrationDeadline: true, capacity: true, registrationCount: true },
  });
  if (!event) throw new NotFoundError("Event not found.");

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
    select: { id: true, status: true },
  });
  const blocker = registrationBlocker(event, existing?.status ?? null, new Date());
  if (blocker) throw blockerError(blocker);

  let registrationId: string;
  try {
    registrationId = await prisma.$transaction(async (tx) => {
      const claimed = await tx.$executeRaw`
        UPDATE "Event" SET "registrationCount" = "registrationCount" + 1
        WHERE id = ${eventId} AND status = 'PUBLISHED' AND "deletedAt" IS NULL
          AND (capacity IS NULL OR "registrationCount" < capacity)`;
      if (claimed === 0) throw new RegistrationAbort("EVENT_FULL");

      const qrToken = nanoid(QR_TOKEN_LENGTH);
      if (existing) {
        // Re-registering after a cancellation: only flip a still-cancelled row.
        const reopened = await tx.eventRegistration.updateMany({
          where: { id: existing.id, status: "CANCELLED" },
          data: { status: "REGISTERED", qrToken, checkedInAt: null, checkedInById: null },
        });
        if (reopened.count === 0) throw new RegistrationAbort("ALREADY_REGISTERED");
        return existing.id;
      }
      const created = await tx.eventRegistration.create({ data: { eventId, userId: user.id, qrToken }, select: { id: true } });
      return created.id;
    });
  } catch (error) {
    if (error instanceof RegistrationAbort) throw blockerError(error.blocker);
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw blockerError("ALREADY_REGISTERED");
    throw error;
  }

  await notifyUsers([user.id], { type: "EVENT", title: `You're registered: ${event.title}`, body: "Your QR ticket is ready.", link: `/my/registrations/${registrationId}` });
  sendEmailAfterResponse(
    { email: user.email, name: user.name },
    () => eventRegistrationEmail({
      name: user.name,
      eventTitle: event.title,
      startAt: event.startAt,
      venue: event.venue,
      bannerUrl: event.bannerUrl,
      ticketUrl: new URL(`/my/registrations/${registrationId}`, env.NEXT_PUBLIC_APP_URL).toString(),
    }),
    "event-registration",
    async () => ({ attachments: [{ name: "campusos-ticket.png", content: (await ticketPng(registrationId)).toString("base64") }] }),
  );
  revalidateEventDetail(eventId);
  return prisma.eventRegistration.findUniqueOrThrow({ where: { id: registrationId }, select: myRegistrationSelect });
}

/** Cancels the user's registration (before the event starts) and frees the seat. */
export async function cancelRegistration(user: AuthUser, eventId: string): Promise<void> {
  const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null }, select: { startAt: true } });
  if (!event) throw new NotFoundError("Event not found.");
  if (event.startAt <= new Date()) throw new ConflictError("Registrations can't be cancelled after the event has started.");

  const cancelled = await prisma.$transaction(async (tx) => {
    const updated = await tx.eventRegistration.updateMany({
      where: { eventId, userId: user.id, status: "REGISTERED" },
      data: { status: "CANCELLED" },
    });
    if (updated.count === 1) {
      await tx.$executeRaw`UPDATE "Event" SET "registrationCount" = GREATEST("registrationCount" - 1, 0) WHERE id = ${eventId}`;
    }
    return updated.count === 1;
  });
  if (!cancelled) throw new NotFoundError("You don't have an active registration for this event.");
  revalidateEventDetail(eventId);
}

/** The signed-in user's registrations, newest first. */
export async function listMyRegistrations(user: AuthUser, query: { status?: RegistrationStatus; cursor?: string; limit: number }): Promise<Page<MyRegistration>> {
  const rows = await prisma.eventRegistration.findMany({
    where: { userId: user.id, status: query.status },
    select: myRegistrationSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

async function ticketPng(registrationId: string): Promise<Buffer> {
  const { qrToken } = await prisma.eventRegistration.findUniqueOrThrow({ where: { id: registrationId }, select: { qrToken: true } });
  return QRCode.toBuffer(qrToken, { errorCorrectionLevel: "M", margin: 2, width: 360 });
}

/** QR ticket for the owner's active registration, as a PNG buffer or data URL. */
export async function getTicketQr(user: AuthUser, registrationId: string): Promise<{ png: Buffer; dataUrl: string; status: RegistrationStatus }> {
  const registration = await prisma.eventRegistration.findFirst({
    where: { id: registrationId, userId: user.id },
    select: { status: true, qrToken: true },
  });
  if (!registration) throw new NotFoundError("Registration not found.");
  if (registration.status === "CANCELLED") throw new ConflictError("This registration was cancelled.");

  const options = { errorCorrectionLevel: "M" as const, margin: 2, width: 360 };
  const [png, dataUrl] = await Promise.all([
    QRCode.toBuffer(registration.qrToken, options),
    QRCode.toDataURL(registration.qrToken, options),
  ]);
  return { png, dataUrl, status: registration.status };
}

// ───────────── Saved events ─────────────

/** Bookmarks an event (idempotent). */
export async function saveEvent(user: AuthUser, eventId: string): Promise<void> {
  const exists = await prisma.event.count({ where: { id: eventId, deletedAt: null, status: { not: "DRAFT" } } });
  if (!exists) throw new NotFoundError("Event not found.");
  await prisma.eventBookmark.upsert({
    where: { userId_eventId: { userId: user.id, eventId } },
    create: { userId: user.id, eventId },
    update: {},
    select: { id: true },
  });
}

/** Removes a bookmark (idempotent). */
export async function unsaveEvent(user: AuthUser, eventId: string): Promise<void> {
  await prisma.eventBookmark.deleteMany({ where: { userId: user.id, eventId } });
}

const savedEventSelect = { id: true, createdAt: true, event: { select: eventCardSelect } } satisfies Prisma.EventBookmarkSelect;
export type SavedEvent = Prisma.EventBookmarkGetPayload<{ select: typeof savedEventSelect }>;

/** The user's saved events, most recently saved first. */
export async function listSavedEvents(user: AuthUser, query: { cursor?: string; limit: number }): Promise<Page<SavedEvent>> {
  const rows = await prisma.eventBookmark.findMany({
    where: { userId: user.id, event: { deletedAt: null } },
    select: savedEventSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

// ───────────── Admin: attendees & check-in ─────────────

const attendeeSelect = {
  id: true,
  status: true,
  createdAt: true,
  checkedInAt: true,
  user: {
    select: { id: true, name: true, email: true, studentId: true, batch: true, department: { select: { code: true } } },
  },
} satisfies Prisma.EventRegistrationSelect;

export type Attendee = Prisma.EventRegistrationGetPayload<{ select: typeof attendeeSelect }>;

async function assertEventAccess(actor: AuthUser, eventId: string): Promise<void> {
  const event = await prisma.event.findFirst({ where: { id: eventId, deletedAt: null }, select: { clubId: true } });
  if (!event) throw new NotFoundError("Event not found.");
  await assertClubAccess(actor, event.clubId);
}

function attendeeWhere(eventId: string, query: { status?: RegistrationStatus; q?: string }): Prisma.EventRegistrationWhereInput {
  return {
    eventId,
    status: query.status,
    ...(query.q
      ? {
          user: {
            OR: [
              { name: { contains: query.q, mode: "insensitive" } },
              { email: { contains: query.q, mode: "insensitive" } },
              { studentId: { contains: query.q, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  };
}

/** Paginated, searchable attendee list for organisers. */
export async function listRegistrations(
  actor: AuthUser,
  eventId: string,
  query: { status?: RegistrationStatus; q?: string; cursor?: string; limit: number },
): Promise<Page<Attendee>> {
  await assertEventAccess(actor, eventId);
  const rows = await prisma.eventRegistration.findMany({
    where: attendeeWhere(eventId, query),
    select: attendeeSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

const EXPORT_BATCH = 1000;
const EXPORT_HEADER = ["Name", "Email", "Student ID", "Department", "Batch", "Status", "Registered At", "Checked In At"];

/** Streams all registrations as CSV in batches (constant memory for large events). */
export async function exportRegistrationsCsv(actor: AuthUser, eventId: string): Promise<ReadableStream<Uint8Array>> {
  await assertEventAccess(actor, eventId);
  const encoder = new TextEncoder();
  let cursor: string | undefined;
  let headerSent = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!headerSent) {
        headerSent = true;
        controller.enqueue(encoder.encode(`﻿${csvRow(EXPORT_HEADER)}`));
        return;
      }
      const batch = await prisma.eventRegistration.findMany({
        where: { eventId },
        select: attendeeSelect,
        orderBy: { id: "asc" },
        take: EXPORT_BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) {
        controller.close();
        return;
      }
      cursor = batch[batch.length - 1].id;
      const rows = batch.map((row) =>
        csvRow([row.user.name, row.user.email, row.user.studentId, row.user.department?.code, row.user.batch, row.status, row.createdAt, row.checkedInAt]),
      );
      controller.enqueue(encoder.encode(rows.join("")));
      if (batch.length < EXPORT_BATCH) controller.close();
    },
  });
}

const checkInCandidateSelect = {
  id: true,
  eventId: true,
  status: true,
  checkedInAt: true,
  event: { select: { status: true, startAt: true, endAt: true, title: true } },
  user: { select: { id: true, name: true, email: true, studentId: true, avatarUrl: true, department: { select: { code: true } } } },
} satisfies Prisma.EventRegistrationSelect;

type CheckInCandidateRow = Prisma.EventRegistrationGetPayload<{ select: typeof checkInCandidateSelect }>;

export interface CheckInResult {
  registrationId: string;
  checkedInAt: Date;
  attendee: CheckInCandidateRow["user"];
  event: { id: string; title: string };
}

/**
 * Authorises the scanner for the door's event FIRST (so staff of other clubs learn
 * nothing about tickets), then applies the check-in state machine and flips
 * REGISTERED → CHECKED_IN with a conditional update, so two scanners can never
 * check the same ticket in twice.
 */
async function performCheckIn(actor: AuthUser, candidate: CheckInCandidateRow | null, eventId: string, request: Request): Promise<CheckInResult> {
  await assertEventAccess(actor, eventId);
  const decision = decideCheckIn(candidate, eventId, new Date());
  if (!decision.ok) {
    const { status, message } = CHECKIN_ERROR_DETAILS[decision.error];
    const details = decision.error === "ALREADY_CHECKED_IN" && candidate ? { checkedInAt: candidate.checkedInAt } : undefined;
    throw new AppError(status, decision.error, message, details);
  }
  const registration = candidate as CheckInCandidateRow;

  const checkedInAt = new Date();
  const updated = await prisma.eventRegistration.updateMany({
    where: { id: registration.id, status: "REGISTERED" },
    data: { status: "CHECKED_IN", checkedInAt, checkedInById: actor.id },
  });
  if (updated.count === 0) {
    const { status, message } = CHECKIN_ERROR_DETAILS.ALREADY_CHECKED_IN;
    throw new AppError(status, "ALREADY_CHECKED_IN", message);
  }

  await audit(actor, "event.checkin", { type: "EventRegistration", id: registration.id }, { eventId }, request);
  revalidateEventDetail(eventId);
  return { registrationId: registration.id, checkedInAt, attendee: registration.user, event: { id: eventId, title: registration.event.title } };
}

/** Check-in by scanning a QR token at `eventId`'s door. */
export async function checkInByQr(actor: AuthUser, input: { qrToken: string; eventId: string }, request: Request): Promise<CheckInResult> {
  const candidate = await prisma.eventRegistration.findUnique({ where: { qrToken: input.qrToken }, select: checkInCandidateSelect });
  return performCheckIn(actor, candidate, input.eventId, request);
}

/** Manual check-in by registration id (attendee forgot their phone). */
export async function checkInManually(actor: AuthUser, eventId: string, registrationId: string, request: Request): Promise<CheckInResult> {
  const candidate = await prisma.eventRegistration.findUnique({ where: { id: registrationId }, select: checkInCandidateSelect });
  return performCheckIn(actor, candidate, eventId, request);
}
