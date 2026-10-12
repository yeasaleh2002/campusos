/**
 * `prisma migrate deploy` with retries. A suspended Neon compute can take a few seconds to
 * wake; the first attempt may fail to connect even though the database is healthy.
 */
import { spawnSync } from "node:child_process";

const ATTEMPTS = 4;
const command = process.platform === "win32" ? "npx.cmd" : "npx";

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  const result = spawnSync(command, ["prisma", "migrate", "deploy"], { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status === 0) process.exit(0);
  if (attempt < ATTEMPTS) {
    process.stdout.write(`migrate deploy failed (attempt ${attempt}/${ATTEMPTS}); retrying in ${attempt * 4}s (Neon may be waking up)...\n`);
    await new Promise((resolve) => setTimeout(resolve, attempt * 4000));
  }
}
process.exit(1);
