/**
 * Deletes uploads that nothing references (abandoned forms, replaced banners...).
 * Only files older than the grace period are considered, so in-flight forms are safe.
 *
 *   npm run uploads:cleanup            # dry run - lists what would be deleted
 *   npm run uploads:cleanup -- --apply # actually delete from UploadThing + DB
 */
try {
  process.loadEnvFile(".env");
} catch {
  // Variables provided by the environment.
}

const GRACE_HOURS = 24;
const BATCH_SIZE = 100;

interface OrphanRow {
  id: string;
  key: string;
  size: number;
}

async function main(): Promise<void> {
  const apply = process.argv.includes("--apply");
  const [{ prisma }, { getUtApi }, { logger }] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/server/services/upload.service"),
    import("../src/lib/logger"),
  ]);

  const cutoff = new Date(Date.now() - GRACE_HOURS * 60 * 60 * 1000);
  let deleted = 0;
  let bytes = 0;
  let cursor = "";

  try {
    for (;;) {
      const orphans = await prisma.$queryRaw<OrphanRow[]>`
        SELECT uf.id, uf.key, uf.size
        FROM "UploadedFile" uf
        WHERE uf."createdAt" < ${cutoff}
          AND uf.id > ${cursor}
          AND NOT EXISTS (SELECT 1 FROM "User" u WHERE u."avatarUrl" = uf.url)
          AND NOT EXISTS (SELECT 1 FROM "Club" c WHERE c."logoUrl" = uf.url OR c."coverUrl" = uf.url)
          AND NOT EXISTS (SELECT 1 FROM "Event" e WHERE e."bannerUrl" = uf.url)
          AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."fileKey" = uf.key OR r."fileUrl" = uf.url)
          AND NOT EXISTS (SELECT 1 FROM "Notice" n WHERE n."attachmentUrl" = uf.url)
          AND NOT EXISTS (SELECT 1 FROM "LostFoundItem" l WHERE uf.url = ANY(l."imageUrls"))
          AND NOT EXISTS (SELECT 1 FROM "Complaint" cp WHERE uf.url = ANY(cp."attachmentUrls"))
        ORDER BY uf.id
        LIMIT ${BATCH_SIZE}`;
      if (orphans.length === 0) break;
      cursor = orphans[orphans.length - 1].id;

      if (apply) {
        const result = await getUtApi().deleteFiles(orphans.map((orphan) => orphan.key));
        if (!result.success) throw new Error("UploadThing deleteFiles failed; aborting before touching the DB.");
        await prisma.uploadedFile.deleteMany({ where: { id: { in: orphans.map((orphan) => orphan.id) } } });
      }
      deleted += orphans.length;
      bytes += orphans.reduce((sum, orphan) => sum + orphan.size, 0);
    }
    logger.info(apply ? "Orphan uploads deleted" : "Orphan uploads found (dry run, pass --apply to delete)", {
      count: deleted,
      megabytes: Number((bytes / 1024 / 1024).toFixed(2)),
      graceHours: GRACE_HOURS,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

// Module scope: keeps `main` from clashing with other scripts during type-checking.
export {};
