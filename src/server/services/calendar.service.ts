import { getDhakaDateKey } from "@/config/campus-calendar";
import type { Prisma } from "@/generated/prisma/client";
import { revalidateCampusClosures } from "@/lib/cache-tags";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import type { ClosureListQuery, CreateClosureInput, UpdateClosureInput } from "@/server/validators/calendar.validators";

const closureSelect = {
  id: true,
  date: true,
  title: true,
  closesCampus: true,
  suspendsBus: true,
  note: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, name: true } },
} satisfies Prisma.CampusClosureSelect;

export type AdminClosure = Omit<Prisma.CampusClosureGetPayload<{ select: typeof closureSelect }>, "date"> & { date: string };

const toAdminClosure = (row: Prisma.CampusClosureGetPayload<{ select: typeof closureSelect }>): AdminClosure => ({ ...row, date: row.date.toISOString().slice(0, 10) });

const toDate = (dateKey: string) => new Date(`${dateKey}T00:00:00Z`);

/** Closure changes refresh the calendar, bus and knowledge-base caches (the chatbot reads closures live). */
function afterChange(): void {
  revalidateCampusClosures();
}

/** Closures for the admin console: upcoming first (oldest date first), keyset-paginated by date then id. */
export async function listClosures(query: ClosureListQuery): Promise<Page<AdminClosure>> {
  const today = getDhakaDateKey(new Date());
  const rows = await prisma.campusClosure.findMany({
    where: query.includePast ? {} : { date: { gte: toDate(today) } },
    select: closureSelect,
    orderBy: query.includePast ? [{ date: "desc" }, { id: "desc" }] : [{ date: "asc" }, { id: "asc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  const page = toPage(rows, query.limit, (row) => row.id);
  return { items: page.items.map(toAdminClosure), nextCursor: page.nextCursor };
}

async function assertDateFree(dateKey: string, exceptId?: string): Promise<void> {
  const clash = await prisma.campusClosure.findUnique({ where: { date: toDate(dateKey) }, select: { id: true } });
  if (clash && clash.id !== exceptId) throw new ConflictError("A closure already exists on this date. Edit it instead.");
}

export async function createClosure(actor: AuthUser, input: CreateClosureInput, request: Request): Promise<AdminClosure> {
  await assertDateFree(input.date);
  const row = await prisma.campusClosure.create({
    data: { date: toDate(input.date), title: input.title, closesCampus: input.closesCampus, suspendsBus: input.suspendsBus, note: input.note ?? null, createdById: actor.id },
    select: closureSelect,
  });
  await audit(actor, "calendar.closure_create", { type: "CampusClosure", id: row.id }, { date: input.date, title: input.title }, request);
  afterChange();
  return toAdminClosure(row);
}

export async function updateClosure(actor: AuthUser, id: string, input: UpdateClosureInput, request: Request): Promise<AdminClosure> {
  const existing = await prisma.campusClosure.findUnique({ where: { id }, select: { id: true } });
  if (!existing) throw new NotFoundError("Closure not found.");
  if (input.date) await assertDateFree(input.date, id);
  const { date, ...rest } = input;
  const row = await prisma.campusClosure.update({ where: { id }, data: { ...rest, ...(date ? { date: toDate(date) } : {}) }, select: closureSelect });
  await audit(actor, "calendar.closure_update", { type: "CampusClosure", id }, { fields: Object.keys(input) }, request);
  afterChange();
  return toAdminClosure(row);
}

export async function deleteClosure(actor: AuthUser, id: string, request: Request): Promise<void> {
  const existing = await prisma.campusClosure.findUnique({ where: { id }, select: { date: true, title: true } });
  if (!existing) throw new NotFoundError("Closure not found.");
  await prisma.campusClosure.delete({ where: { id } });
  await audit(actor, "calendar.closure_delete", { type: "CampusClosure", id }, { date: existing.date.toISOString().slice(0, 10), title: existing.title }, request);
  afterChange();
}
