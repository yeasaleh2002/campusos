# Contributing to CampusOS

Thanks for helping. This file explains how to run the project, the rules the code follows, and what to check before you open a pull request.

## Setup

Follow [Local setup](README.md#local-setup) and [Seed and demo credentials](README.md#seed-and-demo-credentials) in the README. In short:

```bash
npm ci
cp .env.example .env      # fill in your own values; never commit .env
npm run db:deploy         # apply migrations
npm run db:seed           # demo data
npm run dev
```

Next.js 16 has breaking changes. Read the matching guide in `node_modules/next/dist/docs/` before changing routing, caching or rendering code (see `AGENTS.md`).

## Project rules

These come from `GLOBAL_RULES.md` and apply to every change.

- **Secrets:** never hardcode a secret and never print `.env` values. Add new variables to `.env.example` (placeholders only) and to `src/lib/env.ts`.
- **API:** validate every body, query and param with Zod `.strict()`. Use cursor pagination for lists and the `{ success, data, error, meta }` envelope for every response.
- **Caching:** public reads use `"use cache"` with tags. Writes call a helper in `src/lib/cache-tags.ts`. No time-based revalidation.
- **Code style:** TypeScript strict, no `any`, no `console.log` (use `src/lib/logger.ts`), `next/link` for internal navigation.
- **Docs:** every API change is documented in the README in the same pull request. `npm run docs:verify-readme` checks that every route is listed.
- **Campus calendar:** the university is open Friday to Tuesday, closed Wednesday and Thursday, and has no bus service on Wednesday and Thursday. Any "today", "tomorrow", "this week" or "next bus" logic must use `src/config/campus-calendar.ts` and compute the weekday in Asia/Dhaka. Never use the server's UTC day or the browser's local time.
- **Database:** change `prisma/schema.prisma`, add a migration, and update `databasedesign.md`. `npm run docs:verify-db` checks the document against the schema.

## Before you open a pull request

Run all of these and fix every error and warning:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run docs:verify-db
npm run docs:verify-readme
```

For UI or API changes also run the Playwright suite (`npm run test:e2e`). It starts its own dev server on port 3100 with a captured-mail mode, so no real emails are sent. Do not edit app files while it runs.

Add or update tests for what you change: a unit test in `tests/unit` for logic, and a Playwright spec in `tests/e2e` for a user-visible flow. Fixing a bug needs a regression test (see `tests/unit/regressions.test.ts` and `tests/e2e/regressions.spec.ts`).

## Commits and pull requests

- Keep a pull request to one topic. Describe what changed and why, and how you tested it.
- Add a line to [`CHANGELOG.md`](CHANGELOG.md) under the newest version.
- Do not commit generated output (`.next`, `test-results`, `playwright-report`) or anything from `.env`.

## Reporting security problems

Do not open a public issue. Follow [`SECURITY.md`](SECURITY.md).
