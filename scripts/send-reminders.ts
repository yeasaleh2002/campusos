/**
 * Sends "event starts tomorrow" reminders - the same job as GET /api/cron/reminders,
 * for running from a terminal or a non-Vercel scheduler. Idempotent.
 *
 *   npm run reminders:send
 */
try {
  process.loadEnvFile(".env");
} catch {
  // Variables provided by the environment.
}

async function main(): Promise<void> {
  const [{ prisma }, { sendEventReminders }] = await Promise.all([
    import("../src/lib/prisma"),
    import("../src/server/services/platform.service"),
  ]);
  try {
    const report = await sendEventReminders();
    process.stdout.write(`${JSON.stringify(report)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  process.stderr.write(`Reminders failed: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

// Module scope: keeps `main` from clashing with other scripts during type-checking.
export {};
