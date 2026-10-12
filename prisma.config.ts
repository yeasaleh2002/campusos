import { defineConfig } from "prisma/config";

// Prisma 7 no longer auto-loads .env. Load it when present (local dev);
// in CI/hosting the variables come from the environment instead.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file - rely on the process environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // Migrations need a direct (non-pooled) connection; fall back to DATABASE_URL.
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
