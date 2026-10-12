import type { Prisma } from "@/generated/prisma/client";
import { revalidateKnowledgeBase } from "@/lib/cache-tags";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { type Page, toPage } from "@/lib/validation";
import type { AuthUser } from "@/server/middleware/auth";
import { audit } from "@/server/services/audit.service";
import type { AdminEntryListQuery, CreateEntryInput, UpdateEntryInput } from "@/server/validators/helpdesk.validators";

const adminEntrySelect = {
  id: true,
  category: true,
  question: true,
  answer: true,
  keywords: true,
  isPublished: true,
  isSample: true,
  sourceType: true,
  sourceRefId: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.KnowledgeEntrySelect;

export type AdminEntry = Prisma.KnowledgeEntryGetPayload<{ select: typeof adminEntrySelect }>;

/** All entries (published or not) for the admin console. */
export async function listAdminEntries(query: AdminEntryListQuery): Promise<Page<AdminEntry>> {
  const rows = await prisma.knowledgeEntry.findMany({
    where: {
      deletedAt: null,
      category: query.category,
      isPublished: query.published,
      ...(query.q ? { OR: [{ question: { contains: query.q, mode: "insensitive" } }, { answer: { contains: query.q, mode: "insensitive" } }] } : {}),
    },
    select: adminEntrySelect,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: query.limit + 1,
    ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
  });
  return toPage(rows, query.limit, (row) => row.id);
}

export async function createEntry(actor: AuthUser, input: CreateEntryInput, request: Request): Promise<AdminEntry> {
  const entry = await prisma.knowledgeEntry.create({ data: { ...input, sourceType: "MANUAL", createdById: actor.id }, select: adminEntrySelect });
  await audit(actor, "kb.create", { type: "KnowledgeEntry", id: entry.id }, { category: entry.category }, request);
  revalidateKnowledgeBase(entry.id);
  return entry;
}

async function findEntry(id: string) {
  const entry = await prisma.knowledgeEntry.findFirst({ where: { id, deletedAt: null }, select: { id: true, sourceType: true } });
  if (!entry) throw new NotFoundError("Knowledge entry not found.");
  return entry;
}

/**
 * Updates an entry (including publish/unpublish via `isPublished`). Editing an
 * entry also clears its "sample" flag - an admin has now verified it.
 */
export async function updateEntry(actor: AuthUser, id: string, input: UpdateEntryInput, request: Request): Promise<AdminEntry> {
  await findEntry(id);
  const contentEdited = input.question !== undefined || input.answer !== undefined;
  const entry = await prisma.knowledgeEntry.update({
    where: { id },
    data: { ...input, ...(contentEdited ? { isSample: false } : {}) },
    select: adminEntrySelect,
  });
  const action = input.isPublished === undefined ? "kb.update" : input.isPublished ? "kb.publish" : "kb.unpublish";
  await audit(actor, action, { type: "KnowledgeEntry", id }, { fields: Object.keys(input) }, request);
  revalidateKnowledgeBase(id);
  return entry;
}

export async function deleteEntry(actor: AuthUser, id: string, request: Request): Promise<void> {
  await findEntry(id);
  await prisma.knowledgeEntry.update({ where: { id }, data: { deletedAt: new Date(), isPublished: false }, select: { id: true } });
  await audit(actor, "kb.delete", { type: "KnowledgeEntry", id }, undefined, request);
  revalidateKnowledgeBase(id);
}

/** Bulk import (max 500). Existing questions (case-insensitive) are skipped or reported. */
export async function importEntries(
  actor: AuthUser,
  entries: CreateEntryInput[],
  skipDuplicates: boolean,
  request: Request,
): Promise<{ created: number; skipped: string[] }> {
  const questions = entries.map((entry) => entry.question);
  const existing = await prisma.knowledgeEntry.findMany({
    where: { deletedAt: null, question: { in: questions, mode: "insensitive" } },
    select: { question: true },
  });
  const taken = new Set(existing.map((entry) => entry.question.toLowerCase()));
  const seen = new Set<string>();
  const fresh = entries.filter((entry) => {
    const key = entry.question.toLowerCase();
    if (taken.has(key) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const skipped = entries.filter((entry) => !fresh.includes(entry)).map((entry) => entry.question);
  if (skipped.length && !skipDuplicates) {
    throw new ConflictError("Some questions already exist.", { duplicates: skipped });
  }

  const result = await prisma.knowledgeEntry.createMany({
    data: fresh.map((entry) => ({ ...entry, sourceType: "IMPORT" as const, createdById: actor.id })),
  });
  await audit(actor, "kb.import", { type: "KnowledgeEntry" }, { created: result.count, skipped: skipped.length }, request);
  revalidateKnowledgeBase();
  return { created: result.count, skipped };
}

/** Counts a view (fire-and-forget from the route via after()). Not shown publicly, so no revalidation. */
export async function recordEntryView(id: string): Promise<void> {
  await prisma.knowledgeEntry.updateMany({ where: { id }, data: { viewCount: { increment: 1 } } });
}
