/**
 * Prints EXPLAIN plans for the hottest read queries so index use can be verified.
 *
 *   npm run db:explain              # plans as the planner chooses them today
 *   npm run db:explain -- --force   # SET LOCAL enable_seqscan = off: shows whether an index CAN serve the query
 *
 * On small tables Postgres rightly prefers a sequential scan; --force proves the index
 * exists and is usable, which is what matters once tables hold millions of rows.
 */
try {
  process.loadEnvFile(".env");
} catch {
  // Variables provided by the environment.
}

interface PlanNode {
  "Node Type": string;
  "Relation Name"?: string;
  "Index Name"?: string;
  Plans?: PlanNode[];
}

function collect(node: PlanNode, out: string[]): void {
  const target = node["Index Name"] ?? node["Relation Name"];
  out.push(target ? `${node["Node Type"]}(${target})` : node["Node Type"]);
  for (const child of node.Plans ?? []) collect(child, out);
}

async function main(): Promise<void> {
  const force = process.argv.includes("--force");
  const [{ prisma }, { Prisma }, { buildResourceSearchQuery }, { buildKnowledgeQuery }] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/generated/prisma/client"),
    import("../src/server/search/resource-search"),
    import("../src/server/chatbot/retrieval"),
  ]);

  const now = new Date();
  const queries: Array<[string, ReturnType<typeof Prisma.sql>]> = [
    ["events feed (upcoming, published)", Prisma.sql`SELECT id FROM "Event" WHERE status = 'PUBLISHED' AND "deletedAt" IS NULL AND "endAt" >= ${now} ORDER BY "startAt" ASC, id ASC LIMIT 13`],
    ["events by club", Prisma.sql`SELECT id FROM "Event" WHERE "clubId" = 'x' AND status = 'PUBLISHED' AND "deletedAt" IS NULL ORDER BY "startAt" DESC, id DESC LIMIT 13`],
    ["events title search (ILIKE)", Prisma.sql`SELECT id FROM "Event" WHERE "deletedAt" IS NULL AND status = 'PUBLISHED' AND (title ILIKE '%workshop%' OR venue ILIKE '%workshop%') LIMIT 5`],
    ["resources search (FTS + trigram)", buildResourceSearchQuery({ q: "data structures", sort: "relevance", limit: 12 })],
    ["resources by course (list)", Prisma.sql`SELECT id FROM "Resource" WHERE status = 'APPROVED' AND "deletedAt" IS NULL AND "courseId" = 'x' ORDER BY "createdAt" DESC, id DESC LIMIT 13`],
    ["notices board", Prisma.sql`SELECT id FROM "Notice" WHERE "deletedAt" IS NULL AND ("expiresAt" IS NULL OR "expiresAt" > ${now}) ORDER BY pinned DESC, "createdAt" DESC, id DESC LIMIT 13`],
    ["notices text search (ILIKE)", Prisma.sql`SELECT id FROM "Notice" WHERE "deletedAt" IS NULL AND (title ILIKE '%exam%' OR body ILIKE '%exam%') LIMIT 5`],
    ["chatbot retrieval (FTS + trigram)", buildKnowledgeQuery({ text: "when does the bus leave", terms: ["bus", "leave"], limit: 5 })],
    ["lost & found board", Prisma.sql`SELECT id FROM "LostFoundItem" WHERE "deletedAt" IS NULL AND status IN ('OPEN','CLAIMED') ORDER BY "createdAt" DESC, id DESC LIMIT 13`],
    ["lost & found text search (ILIKE)", Prisma.sql`SELECT id FROM "LostFoundItem" WHERE "deletedAt" IS NULL AND (title ILIKE '%wallet%' OR description ILIKE '%wallet%' OR "locationText" ILIKE '%wallet%') LIMIT 5`],
    ["my notifications", Prisma.sql`SELECT id FROM "Notification" WHERE "userId" = 'x' ORDER BY "createdAt" DESC, id DESC LIMIT 20`],
    ["unread badge count", Prisma.sql`SELECT count(*) FROM "Notification" WHERE "userId" = 'x' AND "readAt" IS NULL`],
    ["my registrations", Prisma.sql`SELECT id FROM "EventRegistration" WHERE "userId" = 'x' ORDER BY "createdAt" DESC, id DESC LIMIT 20`],
    ["event attendee list", Prisma.sql`SELECT id FROM "EventRegistration" WHERE "eventId" = 'x' AND status = 'REGISTERED' ORDER BY "createdAt" ASC, id ASC LIMIT 50`],
    ["check-in by QR token", Prisma.sql`SELECT id FROM "EventRegistration" WHERE "qrToken" = 'x'`],
    ["complaints queue", Prisma.sql`SELECT id FROM "Complaint" WHERE status = 'RECEIVED' ORDER BY "createdAt" DESC, id DESC LIMIT 25`],
    ["audit log (by action)", Prisma.sql`SELECT id FROM "AuditLog" WHERE action = 'event.publish' ORDER BY "createdAt" DESC, id DESC LIMIT 30`],
    ["admin user search (ILIKE)", Prisma.sql`SELECT id FROM "User" WHERE "deletedAt" IS NULL AND (name ILIKE '%rahim%' OR email ILIKE '%rahim%' OR "studentId" ILIKE '%rahim%') ORDER BY "createdAt" DESC LIMIT 25`],
    ["login by email", Prisma.sql`SELECT id FROM "User" WHERE email = 'x@example.com'`],
    ["rate-limit upsert key", Prisma.sql`SELECT "count" FROM "RateLimit" WHERE "key" = 'x'`],
  ];

  for (const [label, query] of queries) {
    const result = await prisma.$transaction(async (tx) => {
      if (force) await tx.$executeRaw`SET LOCAL enable_seqscan = off`;
      return tx.$queryRaw<Array<{ "QUERY PLAN": Array<{ Plan: PlanNode; "Execution Time": number }> }>>(Prisma.sql`EXPLAIN (ANALYZE, FORMAT JSON) ${query}`);
    });
    const root = result[0]["QUERY PLAN"][0];
    const nodes: string[] = [];
    collect(root.Plan, nodes);
    const scan = nodes.filter((node) => /Scan/.test(node)).join(" + ") || nodes[0];
    process.stdout.write(`${root["Execution Time"].toFixed(2).padStart(8)} ms  ${label.padEnd(36)} ${scan}\n`);
  }
  await prisma.$disconnect();
}

void main();
