import { after } from "next/server";
import { describeClosedReason, getDhakaDateKey, statusOf, weekdayName } from "@/config/campus-calendar";
import type { Prisma } from "@/generated/prisma/client";
import { revalidateEvents } from "@/lib/cache-tags";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { slugify, uniqueSlugVariant } from "@/lib/slug";
import { type Page, toPage } from "@/lib/validation";
import { eventCancelledEmail, eventUpdatedEmail } from "@/server/email/templates";
import type { AuthUser } from "@/server/middleware/auth";
import { getCampusClosures } from "@/server/queries/calendar.queries";
import { eventCardSelect } from "@/server/queries/event.queries";
import { audit } from "@/server/services/audit.service";
import { assertClubAccess, clubScopeWhere, verifyStaffImage } from "@/server/services/club-access.service";
import { type EmailRecipient, sendBulkEmail } from "@/server/services/email.service";
import { notifyUsers } from "@/server/services/notification.service";
import type { AdminEventListQuery, CreateEventInput, UpdateEventInput } from "@/server/validators/event.validators";

const adminEventSelect = {
  ...eventCardSelect,
  description: true,
  clubId: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.EventSelect;

export type AdminEvent = Prisma.EventGetPayload<{ select: typeof adminEventSelect }>;

const ATTENDEE_BATCH = 1000;

interface Schedule {
  startAt: Date;
  endAt: Date;
  registrationDeadline: Date | null;
}

/** Throws a VALIDATION_ERROR when the schedule is inconsistent. */
export function assertValidSchedule(schedule: Schedule): void {
  const issues: Array<{ path: string; message: string }> = [];
  if (schedule.endAt <= schedule.startAt) issues.push({ path: "endAt", message: "End time must be after the start time." });
  if (schedule.registrationDeadline && schedule.registrationDeadline > schedule.startAt) {
    issues.push({ path: "registrationDeadline", message: "Registration must close before the event starts." });
  }
  if (issues.length) throw new ValidationError(undefined, issues);
}

async function findManagedEvent(actor: AuthUser, eventId: string) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { id: true, clubId: true, status: true, title: true, slug: true, startAt: true, endAt: true, venue: true, capacity: true, registrationCount: true, registrationDeadline: true },
  });
  if (!event) throw new NotFoundError("Event not found.");
  await assertClubAccess(actor, event.clubId);
  return event;
}

async function uniqueEventSlug(title: string): Promise<string> {
  const base = slugify(title);
  const taken = await prisma.event.findUnique({ where: { slug: base }, select: { id: true } });
  return taken ? uniqueSlugVariant(base) : base;
}

/**
 * Notifies every active registrant (in-app + one bulk email per 500 people).
 * Runs after the response so large events don't slow the admin request.
 */
function notifyAttendeesAfterResponse(eventId: string, notification: { title: string; body: string; link: string }, email: () => ReturnType<typeof eventCancelledEmail>, tag: string) {
  after(async () => {
    let cursor: string | undefined;
    const rendered = email();
    for (;;) {
      const batch = await prisma.eventRegistration.findMany({
        where: { eventId, status: { in: ["REGISTERED", "CHECKED_IN"] } },
        select: { id: true, user: { select: { id: true, email: true, name: true } } },
        orderBy: { id: "asc" },
        take: ATTENDEE_BATCH,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (batch.length === 0) break;
      cursor = batch[batch.length - 1].id;
      await notifyUsers(batch.map((row) => row.user.id), { type: "EVENT", ...notification });
      const recipients: EmailRecipient[] = batch.map((row) => ({ email: row.user.email, name: row.user.name }));
      await sendBulkEmail(recipients, rendered, tag);
      if (batch.length < ATTENDEE_BATCH) break;
    }
  });
}

/** Lists events for the admin console, newest start first (CLUB_ADMIN: own clubs only). */
export async function listAdminEvents(actor: AuthUser, query: AdminEventListQuery): Promise<Page<AdminEvent>> {
  const scope = await clubScopeWhere(actor);
  const rows = await prisma.event.findMany({
    where: {
      deletedAt: null,
      status: query.status,
      ...scope,
      ...(query.clubId ? { AND: [{ clubId: query.clubId }] } : {}),
      ...(query.q ? { title: { contains: query.q, mode: "insensitive" } } : {}),
    },
    select: adminEventSelect,
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (event) => event.id);
}

/** Single event (any status) for the admin console. */
export async function getAdminEvent(actor: AuthUser, eventId: string): Promise<AdminEvent> {
  await findManagedEvent(actor, eventId);
  return prisma.event.findUniqueOrThrow({ where: { id: eventId }, select: adminEventSelect });
}

/** Creates an event as a draft, or published when `publish` is true. */
/**
 * An event on a weekly off day (Wednesday, Thursday) or a campus closure needs the organiser's explicit
 * confirmation (`confirmOffDay: true`); the form shows a warning and a checkbox.
 */
async function assertOpenDayOrConfirmed(startAt: Date, confirmOffDay: boolean | undefined): Promise<void> {
  const status = statusOf(startAt, await getCampusClosures());
  if (status.open || confirmOffDay) return;
  throw new AppError(422, "OFF_DAY_CONFIRMATION_REQUIRED", `The campus is closed on ${weekdayName(status.weekday)} (${describeClosedReason(status)}). Confirm that you want to schedule the event on this day.`, {
    field: "confirmOffDay",
  });
}

export async function createEvent(actor: AuthUser, input: CreateEventInput, request: Request): Promise<AdminEvent> {
  await assertClubAccess(actor, input.clubId);
  const club = await prisma.club.findFirst({ where: { id: input.clubId, deletedAt: null, isActive: true }, select: { id: true } });
  if (!club) throw new ValidationError(undefined, [{ path: "clubId", message: "Unknown or inactive club." }]);

  const schedule = { startAt: input.startAt, endAt: input.endAt, registrationDeadline: input.registrationDeadline ?? null };
  assertValidSchedule(schedule);
  if (input.publish && input.endAt <= new Date()) throw new ValidationError("Cannot publish an event that has already ended.");
  await verifyStaffImage(actor, input.bannerUrl, "bannerUrl");
  const { publish, confirmOffDay, ...fields } = input;
  await assertOpenDayOrConfirmed(input.startAt, confirmOffDay);

  const event = await prisma.event.create({
    data: { ...fields, slug: await uniqueEventSlug(input.title), status: publish ? "PUBLISHED" : "DRAFT", createdById: actor.id },
    select: adminEventSelect,
  });

  await audit(actor, "event.create", { type: "Event", id: event.id }, { title: event.title, status: event.status }, request);
  revalidateEvents(event.id);
  return event;
}

/**
 * Updates an event. Registrants of a published event are notified when the
 * schedule or venue changes. Capacity cannot drop below current registrations.
 */
export async function updateEvent(actor: AuthUser, eventId: string, input: UpdateEventInput, request: Request): Promise<AdminEvent> {
  const current = await findManagedEvent(actor, eventId);
  if (current.status === "CANCELLED" || current.status === "COMPLETED") {
    throw new ConflictError(`A ${current.status.toLowerCase()} event cannot be edited.`);
  }
  if (input.clubId && input.clubId !== current.clubId) await assertClubAccess(actor, input.clubId);

  const schedule = {
    startAt: input.startAt ?? current.startAt,
    endAt: input.endAt ?? current.endAt,
    registrationDeadline: input.registrationDeadline === undefined ? current.registrationDeadline : input.registrationDeadline,
  };
  assertValidSchedule(schedule);
  if (input.capacity !== undefined && input.capacity !== null && input.capacity < current.registrationCount) {
    throw new ConflictError(`Capacity cannot be lower than the ${current.registrationCount} existing registrations.`);
  }
  await verifyStaffImage(actor, input.bannerUrl, "bannerUrl");
  const { confirmOffDay, ...changes } = input;
  if (input.startAt && getDhakaDateKey(input.startAt) !== getDhakaDateKey(current.startAt)) await assertOpenDayOrConfirmed(input.startAt, confirmOffDay);

  const event = await prisma.event.update({ where: { id: eventId }, data: changes, select: adminEventSelect });
  await audit(actor, "event.update", { type: "Event", id: eventId }, { fields: Object.keys(input) }, request);

  const scheduleChanged =
    event.startAt.getTime() !== current.startAt.getTime() ||
    event.endAt.getTime() !== current.endAt.getTime() ||
    event.venue !== current.venue;
  if (current.status === "PUBLISHED" && scheduleChanged) {
    notifyAttendeesAfterResponse(
      eventId,
      { title: `Updated: ${event.title}`, body: "The time or venue of this event changed.", link: `/events/${event.slug}` },
      () => eventUpdatedEmail({ eventTitle: event.title, eventSlug: event.slug, startAt: event.startAt, endAt: event.endAt, venue: event.venue }),
      "event-updated",
    );
  }
  revalidateEvents(eventId);
  return event;
}

/** DRAFT → PUBLISHED. */
export async function publishEvent(actor: AuthUser, eventId: string, request: Request): Promise<AdminEvent> {
  const current = await findManagedEvent(actor, eventId);
  if (current.status !== "DRAFT") throw new ConflictError("Only draft events can be published.");
  if (current.endAt <= new Date()) throw new ConflictError("Cannot publish an event that has already ended.");

  const event = await prisma.event.update({ where: { id: eventId }, data: { status: "PUBLISHED" }, select: adminEventSelect });
  await audit(actor, "event.publish", { type: "Event", id: eventId }, { title: event.title }, request);
  revalidateEvents(eventId);
  return event;
}

/** DRAFT/PUBLISHED → CANCELLED, notifying registrants with the reason. */
export async function cancelEvent(actor: AuthUser, eventId: string, reason: string, request: Request): Promise<AdminEvent> {
  const current = await findManagedEvent(actor, eventId);
  if (current.status !== "DRAFT" && current.status !== "PUBLISHED") {
    throw new ConflictError(`A ${current.status.toLowerCase()} event cannot be cancelled.`);
  }

  const event = await prisma.event.update({ where: { id: eventId }, data: { status: "CANCELLED" }, select: adminEventSelect });
  await audit(actor, "event.cancel", { type: "Event", id: eventId }, { title: event.title, reason }, request);
  if (current.status === "PUBLISHED") {
    notifyAttendeesAfterResponse(
      eventId,
      { title: `Cancelled: ${event.title}`, body: reason, link: `/events/${event.slug}` },
      () => eventCancelledEmail({ eventTitle: event.title, startAt: event.startAt, reason }),
      "event-cancelled",
    );
  }
  revalidateEvents(eventId);
  return event;
}

/** Soft-deletes an event. A published event with active registrations must be cancelled first. */
export async function deleteEvent(actor: AuthUser, eventId: string, request: Request): Promise<void> {
  const current = await findManagedEvent(actor, eventId);
  if (current.status === "PUBLISHED" && current.registrationCount > 0) {
    throw new ConflictError("This event has registrations. Cancel it first so attendees are notified.");
  }
  await prisma.event.update({ where: { id: eventId }, data: { deletedAt: new Date() }, select: { id: true } });
  await audit(actor, "event.delete", { type: "Event", id: eventId }, { title: current.title }, request);
  revalidateEvents(eventId);
}

export interface EventStats {
  eventId: string;
  capacity: number | null;
  registered: number;
  checkedIn: number;
  cancelled: number;
  fillRate: number | null;
  /** Share of registrants who never checked in; null until the event has ended. */
  noShowRate: number | null;
}

const ratio = (part: number, whole: number) => (whole === 0 ? 0 : Number((part / whole).toFixed(4)));

/** Attendance numbers for one event. */
export async function getEventStats(actor: AuthUser, eventId: string): Promise<EventStats> {
  const event = await findManagedEvent(actor, eventId);
  const groups = await prisma.eventRegistration.groupBy({ by: ["status"], where: { eventId }, _count: { _all: true } });
  const count = (status: string) => groups.find((group) => group.status === status)?._count._all ?? 0;

  const checkedIn = count("CHECKED_IN");
  const registered = count("REGISTERED") + checkedIn;
  return {
    eventId,
    capacity: event.capacity,
    registered,
    checkedIn,
    cancelled: count("CANCELLED"),
    fillRate: event.capacity ? ratio(registered, event.capacity) : null,
    noShowRate: event.endAt <= new Date() ? ratio(registered - checkedIn, registered) : null,
  };
}
