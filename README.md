# CampusOS: City University

**One hub for campus life at City University, Bangladesh.** Events and clubs, academic resources, notices, bus schedules, lost and found, complaints, and an "Ask CampusOS" assistant live in one fast, mobile-first web app, instead of being scattered across Facebook groups, Google Forms and notice boards.

Built by **Nurix Hive** for the CPCCU AI-Powered Web App Development & Deployment Hackathon 2026.

| | |
| --- | --- |
| **Live app** | https://campusos-tawny.vercel.app |
| **Demo accounts** | One per role (student, club admin, moderator, admin, super admin). The seed creates them from the `.env` values listed in [Seed and demo credentials](#seed-and-demo-credentials). The passwords are given to the judges in the submission form, not in this repository. |
| **Demo video** | See `demovideoscript.md` for the walkthrough; the public Drive link is in the submission form. |
| **Not built (on purpose)** | The optional AI bonus ideas. See [`pending.md`](pending.md). |

---

## Contents

1. [Overview](#overview)
2. [Problem → solution scenarios](#problem--solution-scenarios)
3. [Real-world usability for a CU student](#real-world-usability-for-a-cu-student)
4. [Modules](#modules)
5. [Tech stack](#tech-stack)
6. [Architecture](#architecture)
7. [Environment variables](#environment-variables)
8. [Local setup](#local-setup)
9. [Seed and demo credentials](#seed-and-demo-credentials)
10. [Campus calendar and bus service rules](#campus-calendar-and-bus-service-rules)
11. [API reference](#api-reference)
12. [Caching tag map](#caching-tag-map)
13. [Security](#security)
14. [Deployment](#deployment)
15. [Folder structure](#folder-structure)
16. [Frontend Architecture](#frontend-architecture)
17. [User portal and public pages](#user-portal-and-public-pages)
18. [Admin portal](#admin-portal)
19. [Production hardening](#production-hardening)
20. [Credits](#credits)

---

## Overview

CampusOS is a single Next.js application. It serves the pages and the JSON API (`/api/*`) and stores its data in Neon PostgreSQL through Prisma. Public pages are served from a tag-invalidated cache, so they load instantly from the CDN and are refreshed only when an admin or user changes the underlying data.

It implements **all four** modules of the problem statement (Club & Event Engine, Resource Hub, Smart Helpdesk, Lost & Found / Complaint Box), a role-based admin console, and a campus calendar that knows City University's real week: **open Friday to Tuesday, closed Wednesday and Thursday, no buses on Wednesday and Thursday**.

**Try it in three minutes**

1. Open the live app on your phone or laptop. The landing page shows the live next-bus widget and this week's events.
2. Sign up with an email (a 6-digit code arrives by email), or sign in with the demo student.
3. Register for an event and open the QR ticket. Ask the assistant *"Is the university open tomorrow?"*. Open `/bus` and pick **Wednesday** in the weekday selector.
4. Sign in at `/admin/login` with an admin account to see the console: create an event on a Wednesday (it asks for confirmation), approve a resource, add a campus closure.

## Problem → solution scenarios

| Today's problem | With CampusOS |
| --- | --- |
| Event announcements get lost in Facebook groups, and registration happens through scattered Google Forms. | A single events feed with filters. One-click registration produces a QR ticket that is scanned at the door. |
| Previous question papers and notes live in random Drive links. | A searchable, moderated resource library organized by department, course and semester, with bookmarks and full-text search. |
| A class gets cancelled and half the section never sees the notice. | Categorized, pinnable notices targeted by department or course, plus in-app notifications. |
| "When does the next bus leave for Dhanmondi?", and on Wednesday there is no bus at all. | Route and trip timetables that respect the campus week, also answered by the assistant. |
| A lost ID card is posted once and buried. | A lost and found board with photos and claim requests that admins verify. |
| Complaints disappear, or students fear retaliation. | Ticketed complaints (`CU-2026-000123`) with status tracking and an optional anonymous mode. |
| The same questions about rules, exams and admission get asked over and over. | A knowledge-base chatbot that also logs unanswered questions so admins can fill the gaps. |
| Club forms and deadlines are spread everywhere. | A central "Forms & deadlines" listing. |

## Real-world usability for a CU student

Nine situations a City University student meets in a normal week, and what CampusOS does in each. Each one is a path you can click through in the live app.

| # | Situation | What the student does | Module and page |
| --- | --- | --- | --- |
| 1 | **Rahim, first-year, is afraid of missing the bus.** | Opens `/` on his phone. The ticker shows an urgent notice, the next-bus widget says *R2 to campus in 12 min*, and the 360 px layout needs no zooming. | Landing, `/bus` |
| 2 | **Tisha plans her Wednesday.** She wonders if the bus runs. | Opens `/bus`. On Wednesday the page says *No bus service today: Wednesday is a weekly off day* and shows the next service on Friday. She can ask the assistant too: *"Is the university open tomorrow?"* | Campus calendar, `/bus`, assistant |
| 3 | **Nusrat wants old DBMS questions before the midterm.** | Types `dbms prev` in `/resources`. Synonym expansion and typo tolerance find *Database Management Systems - Previous Questions*. She bookmarks it and downloads the PDF in two taps. | Resource Hub |
| 4 | **Sabbir has notes for an elective that is not in the course list.** | In `/dashboard/resources/upload` he taps *My course is not listed*, types the course name, and submits. A moderator approves it. | Resource Hub, moderation |
| 5 | **A club member registers for a workshop.** | On the event page a countdown and a seats bar show urgency. *Register now* gives a QR ticket at once, plus a calendar link. At the door, the admin scans it. | Club & Event Engine |
| 6 | **A club admin plans an event.** | Picks a Wednesday by mistake. The form warns that the campus is closed and will not submit until the admin confirms. | Event admin, campus calendar |
| 7 | **Lost ID card.** Tanvir posts a *Found* item with two photos. | The system suggests the matching *Lost* post. The owner claims it, Tanvir approves, and only then does the owner see his contact details. The status updates on screen without a reload. | Lost & Found |
| 8 | **Sensitive complaint.** | A student files a harassment complaint with *Hide my identity from staff* on. She gets ticket `CU-2026-000123` and tracks its timeline without ever being named to staff. | Complaint Box |
| 9 | **Night-before panic.** | Someone asks the assistant in Banglish, *"exam er seat plan kothay?"*. If the knowledge base cannot answer with confidence, the assistant says so and logs the question for admins. | Smart Helpdesk |

## Modules

1. **Events & Clubs:** clubs, memberships, club admins, events, registrations with QR check-in, calendar export, and a central form-link listing. Pages: `/events`, `/clubs`, `/forms`, `/dashboard/registrations`.
2. **Academic Resources:** notes, question papers and lab manuals uploaded as PDFs. Uploads go through moderation and support full-text and fuzzy search plus bookmarks. Pages: `/resources`, `/dashboard/resources/upload`.
3. **Campus Info & Assistant:** notices, bus routes and trips, the campus calendar, and a knowledge base with a retrieval-first chatbot. Pages: `/notices`, `/bus`, `/helpdesk`.
4. **Lost & Found + Complaints:** item board with claims, and ticketed complaints with an update timeline. Pages: `/lost-found`, `/complaints/new`, `/complaints/track`.
5. **Platform:** auth with email OTP, roles, notifications, audit log, DB-backed rate limiting and upload tracking. Admin console at `/admin`.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Cache Components, Route Handlers), React 19, TypeScript strict |
| Database | PostgreSQL on Neon, Prisma 7 with `@prisma/adapter-pg`, `pg_trgm`, tsvector full-text search |
| Validation | Zod 4 |
| Auth | `jose` (HS256 JWT in an httpOnly cookie), `bcryptjs` (cost 12), email OTP |
| Email | Brevo REST API via native `fetch` |
| Uploads | UploadThing; images compressed with `image-video-compressor` (sharp) |
| UI | Tailwind CSS 4, Framer Motion (LazyMotion), lucide-react, react-hot-toast |
| Utilities | date-fns, qrcode, nanoid, clsx + tailwind-merge |

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). It covers the layering (routes → validators → services → repositories), the API envelope, the tag-based ISR strategy, auth, uploads, search and the chatbot.

## Environment variables

Copy `.env.example` to `.env` and fill it in. `src/lib/env.ts` validates every variable at startup and fails with a list of what is missing or invalid. Values are never printed. Only `NEXT_PUBLIC_*` values reach the browser.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NODE_ENV` | no | `development` / `test` / `production` |
| `NEXT_PUBLIC_APP_URL` | yes | Public base URL; also the allowed Origin for mutations |
| `NEXT_PUBLIC_APP_NAME` | no | Display name |
| `DATABASE_URL` | yes | Neon **pooled** connection string (runtime) |
| `DIRECT_URL` | yes | Neon **direct** connection string (migrations) |
| `JWT_SECRET` | yes | ≥ 32 characters, HS256 signing key |
| `JWT_EXPIRES_IN` | yes | Session lifetime, e.g. `7d` |
| `BREVO_API_KEY` | yes | Brevo transactional email |
| `BREVO_SENDER_EMAIL` / `BREVO_SENDER_NAME` | yes | Verified sender |
| `UPLOADTHING_TOKEN` | yes | UploadThing server token |
| `REVALIDATE_SECRET` | yes | ≥ 16 characters, guards the manual revalidation endpoint |
| `CRON_SECRET` | yes | ≥ 16 characters, guards cron endpoints |
| `LLM_API_KEY` | no | Anthropic API key. Turns on an optional rephrasing layer (Claude, 3 s budget) over knowledge-base answers. The chatbot is fully functional without it. |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | no | Cloudflare Turnstile bot protection. Set **both or neither**: the login, signup and forgot-password forms render the widget when the site key is set, and the API requires a valid token when the secret is set. In Vercel enter the values **without quotes**, and redeploy after changing `NEXT_PUBLIC_*` (it is inlined at build time). Cloudflare's dummy pair for testing is `1x00000000000000000000AA` / `1x0000000000000000000000000000000AA`. |
| `ADMIN1..4_EMAIL` / `ADMIN1..4_PASSWORD` | seed only | Admin accounts created by the seed |
| `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` | seed only | Demo student account created by the seed |

## Local setup

Requirements: Node.js ≥ 20.12 (developed on 24) and a Neon (or any PostgreSQL 15+) database.

```bash
npm install                 # also runs `prisma generate`
cp .env.example .env        # then fill in the values
npm run db:deploy           # apply migrations (includes pg_trgm + full-text search)
npm run db:seed             # staff + demo accounts, departments, clubs
npm run dev                 # http://localhost:3000
```

| Script | Does |
| --- | --- |
| `dev` / `build` / `start` | Next.js dev server / production build (runs `prisma generate` first) / serve the build |
| `lint` | ESLint |
| `typecheck` | `next typegen` + `tsc --noEmit` |
| `db:generate` | Generate the Prisma client into `src/generated/prisma` |
| `db:migrate` | Create and apply a new migration in development (`prisma migrate dev`) |
| `db:deploy` | Apply pending migrations (`prisma migrate deploy`), for CI and production |
| `db:seed` | Run `prisma/seed.ts` (idempotent) |
| `test` / `test:watch` | Vitest unit tests (`tests/unit`, fake env, no DB or network) |
| `uploads:cleanup` | Lists orphaned uploads older than 24 h; add `-- --apply` to delete them from UploadThing and the DB |
| `reminders:send` | Sends "event starts tomorrow" reminders (same job as `GET /api/cron/reminders`; idempotent) |
| `db:studio` | Prisma Studio |

> **Prisma 7 note:** connection URLs are not in `schema.prisma`. The CLI reads `DIRECT_URL` from `prisma.config.ts`, and the app connects with the pooled `DATABASE_URL` in `src/lib/prisma.ts`.

## Seed and demo credentials

Run `npm run db:seed`. It is idempotent and safe to re-run. It creates:

| Account | Role | Credentials from |
| --- | --- | --- |
| Super admin | `SUPER_ADMIN` | `ADMIN1_EMAIL` / `ADMIN1_PASSWORD` |
| Admin | `ADMIN` | `ADMIN2_EMAIL` / `ADMIN2_PASSWORD` |
| Club admin (admin of *CU Computer Club*) | `CLUB_ADMIN` | `ADMIN3_EMAIL` / `ADMIN3_PASSWORD` |
| Moderator | `MODERATOR` | `ADMIN4_EMAIL` / `ADMIN4_PASSWORD` |
| Demo student (CSE, batch 58) | `USER` | `DEMO_USER_EMAIL` / `DEMO_USER_PASSWORD` |
| Demo student 2 (BBA, batch 60) | `USER` | `DEMO_USER_EMAIL` with `+2` added before the `@`, same password |

- All seeded accounts are pre-verified, and their passwords must pass the password policy or the seed stops with a clear error.
- **A re-run never overwrites a password.** Passwords are set only when an account is first created.
- The seed also creates demo content (`prisma/seed-content.ts`):
  - 9 departments (CSE, EEE, CE, TE, BBA, ENG, BAN, JMC, LAW) and 56 courses.
  - 12 clubs. The CLUB_ADMIN is the admin of *CU Computer Club*.
  - 30 events, dated relative to the seed day (Dhaka): 23 published (several this week), 4 completed, 1 cancelled and 2 drafts. *Mock Interview Day* has only 5 seats, to demo capacity limits.
  - 6 registrations for the demo students.
  - 60 resources across all departments: 55 approved, 4 pending (in the moderation queue) and 1 rejected.
- **Sample files are clearly flagged.** Every seed resource has `isSample: true` and a `sample-resource-NNN` key, and points at one real generated PDF (`campusos-sample-resource.pdf`). The seed uploads that PDF to UploadThing once and tracks it in `UploadedFile`. If the upload fails, a flagged placeholder URL is used instead.
- Event dates and the counters (`registrationCount`, sample `downloadCount`) are refreshed on each run.
- **Helpdesk & campus content** (`prisma/seed-campus.ts`):
  - **95 sample FAQ entries (plus entries generated from bus routes and notices)**, all `isSample: true` (*sample data that admins must verify*; the chatbot labels answers drawn from them). Editing an entry clears the flag.
  - 6 bus routes to the Khagan/Birulia campus with Fri–Tue trips (no service Wed/Thu), and their auto-generated KB entries.
  - 8 notices (two EXAM notices, auto-synced into the KB, and two class cancellations).
  - 5 open forms with **placeholder `example.com` URLs**, to be replaced with real Google Form links.
  - 6 lost & found posts by the demo students.
- Credentials are never committed to the repository.

## Campus calendar and bus service rules

City University is **open Friday to Tuesday** and **closed Wednesday and Thursday**. **No bus runs on Wednesday or Thursday.** The week starts on **Friday** (Friday, Saturday, Sunday, Monday, Tuesday, Wednesday, Thursday).

- **One source of truth:** `src/config/campus-calendar.ts`. Every "today", "tomorrow", "this week" and "next bus" decision calls its helpers. The weekday is always computed in **Asia/Dhaka** (`Intl.DateTimeFormat`), never from the server's UTC day or the browser's local zone.
- **Special closures:** the `CampusClosure` table (public holidays, exam-day bus changes) overrides the weekly rule for one date. Admins manage it at `/admin/calendar` ("Campus calendar") or through `/api/admin/calendar/closures`. A closure must close the campus, suspend the bus, or both.
- **Where it applies:**

| Area | Behaviour |
| --- | --- |
| Bus data | Seed and admin trips may only use Friday to Tuesday. A Wednesday or Thursday day is rejected with `422 BUS_DAY_NOT_ALLOWED`, and a database CHECK constraint (`BusTrip_no_off_days`) backs it up. |
| Bus pages, landing widget | On an off day or a suspended day the page shows "No bus service today" with the reason and the next service time. The live countdown only runs on a service day. The route page has a weekday selector (Friday first) that marks Wednesday and Thursday as off days. The day is resolved in the browser from the Dhaka clock and the cached closures, so there is no time-based revalidation. |
| `GET /api/bus/next`, `GET /api/bus/routes/{code}` | Return `service`, `reason`, `message` and `nextServiceAt`, and the departures start at the next service day. |
| Chatbot | Answers "is the university open today / tomorrow / on Wednesday?", "when is the next working day?" and "which days does the bus run?" in English, Banglish and Bangla. The bus knowledge-base entries state the working days and the Wednesday/Thursday rule. |
| Events | Creating or moving an event onto Wednesday or Thursday needs `confirmOffDay: true` (`422 OFF_DAY_CONFIRMATION_REQUIRED` otherwise); the admin form shows a warning and a checkbox. Cards and the calendar mark off days, the calendar starts on Friday, and the "This week" filter is the Dhaka Friday to Thursday week. |
| Notices | Class-cancellation notices for an off day show a soft warning (not blocking). |
| Reminders | The event reminder cron computes "tomorrow" from the Dhaka date. |

Changing a closure expires the tags `calendar`, `buses` and `kb`, so the bus pages and chatbot answers update immediately.

## API reference

All endpoints return the standard envelope:

```json
{ "success": true, "data": {}, "meta": { "page": 1, "limit": 20, "nextCursor": null, "total": 0 } }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Request validation failed.", "details": [] } }
```

Common error codes:

| Code | Status |
| --- | --- |
| `BAD_REQUEST` | 400 |
| `VALIDATION_ERROR` | 400 |
| `UNAUTHORIZED` | 401 |
| `FORBIDDEN` | 403 |
| `NOT_FOUND` | 404 |
| `CONFLICT` | 409 |
| `PAYLOAD_TOO_LARGE` | 413 |
| `UNSUPPORTED_MEDIA_TYPE` | 415 |
| `RATE_LIMITED` | 429 (with `Retry-After`) |
| `INTERNAL_ERROR` | 500 |
| `EMAIL_DELIVERY_FAILED` | 503 (safe to retry) |

Auth-specific codes:

| Code | Status | Meaning |
| --- | --- | --- |
| `INVALID_CREDENTIALS` | 401 | Wrong email/password, inactive account, or non-staff on admin login. Always the same message. |
| `EMAIL_NOT_VERIFIED` | 403 | Correct credentials, but the email is not verified yet. A fresh OTP is sent. |
| `INVALID_OTP` | 400 | Wrong, unknown or already-used code. |
| `OTP_EXPIRED` | 400 | The code is older than 10 minutes. |
| `OTP_ATTEMPTS_EXCEEDED` | 400 | 5 wrong guesses. Request a new code. |
| `INVALID_CURRENT_PASSWORD` | 400 | The current password is wrong when changing password. |

Every response includes an `x-request-id` header.

### Conventions

- **Auth:** an httpOnly cookie `campusos_session` holds an HS256 JWT with claims `sub`, `role` and `tokenVersion`. On every protected request the server re-checks that the account is active and verified and that `tokenVersion` matches the database.
- **Mutating requests** (`POST`/`PATCH`/`DELETE`):
  - Must send an `Origin` (or `Referer`) header equal to the app origin, which browsers do automatically. Otherwise the response is `403 FORBIDDEN`.
  - Must use `Content-Type: application/json`. Otherwise `415`.
  - The body is limited to 16 KB. Otherwise `413`.
  - Validation is strict: unknown fields are rejected with `400 VALIDATION_ERROR`, which blocks mass assignment such as sending `"role"`.
- **Public forms** (signup, forgot-password, login) accept these anti-bot fields:
  - `website`: a honeypot that must stay empty. If filled, the server returns a fake success and does nothing.
  - `formToken`: from `GET /api/security/form-token`. Required on signup and forgot-password. It must be at least 2 s and at most 2 h old.
  - `turnstileToken`: required only when `TURNSTILE_SECRET_KEY` is set.
- **Password policy:** 8–72 characters, with an uppercase letter, a lowercase letter and a number, and not a common password.

#### Rate limits

| Tier | Limit | Applied to |
| --- | --- | --- |
| `authStrict` (DB) | 10 / 15 min per IP per endpoint | signup, verify-email, resend-otp, login, admin login, forgot/reset password, change-password |
| `otpPerEmail` (DB) | 5 / hour per email | OTP emails (resend, forgot-password) |
| Login lockout (DB) | 5 failures / 15 min per email+IP, then locked for 15 min | login, admin login |
| OTP resend cooldown | 60 s between codes per user and purpose | signup, resend-otp, forgot-password |
| `write` (DB) | 60 / min per IP | profile update, logout-all |
| `search` (DB) | 30 / min per IP | search and chatbot (later tasks) |
| `publicRead` (memory) | 300 / min per IP per instance | form-token, public reads |

### Auth flow

```
SIGN-UP
  GET  /api/security/form-token ──► { formToken }               (wait ≥ 2 s, user fills form)
  POST /api/auth/signup ──► user (isEmailVerified=false) ──► OTP (HMAC hash, 10 min, 5 tries) ──► Brevo email
  POST /api/auth/verify-email {email, code} ──► verified ──► Set-Cookie campusos_session ──► welcome email (async)

LOGIN                                 lockout check (email+IP) ─► 429 if locked
  POST /api/auth/login ──► bcrypt compare (dummy hash if no user) ──┬─ wrong   ─► 401 INVALID_CREDENTIALS (+1 failure)
                                                                     ├─ unverified ─► 403 EMAIL_NOT_VERIFIED (+ fresh OTP)
                                                                     └─ ok      ─► Set-Cookie, failures cleared
  POST /api/auth/admin/login ─── same, but non-staff roles ─► 401 INVALID_CREDENTIALS

EVERY PROTECTED REQUEST
  proxy.ts: verify JWT (no DB) ─► redirect /login | /admin/login, or 401/403 JSON for /api/admin/*
  route handler: requireAuth() ─► JWT + DB (isActive, verified, tokenVersion == claim), memoised per request

PASSWORD RESET
  POST /api/auth/forgot-password ─► always the same 200; if the account exists, OTP sent after the response
  POST /api/auth/reset-password {email, code, newPassword} ─► new hash, tokenVersion++ (all sessions revoked),
                                                              other OTPs invalidated, "password changed" email

SESSION REVOCATION
  change-password ─► tokenVersion++ ; this device gets a new cookie, all others are signed out
  logout-all      ─► tokenVersion++ ; cookie cleared
  logout          ─► cookie cleared (this device only)
```

### Endpoints

#### `GET /api/security/form-token`

Issues a signed timestamp for the minimum-time-to-submit check.

- **Auth:** none. **Rate limit:** `publicRead`. **Headers:** none.
- **Success (200),** sent with `Cache-Control: no-store`:

```json
{ "success": true, "data": { "formToken": "1791390191397.1kHGzOc_F8asELToripCPQ6VDQ4qlFxaPTSpLqQjIIM", "minAgeSeconds": 2, "maxAgeSeconds": 7200 } }
```

- **Errors:** 429 `RATE_LIMITED`.

#### `POST /api/auth/signup`

Creates an unverified account and emails a 6-digit OTP. Re-submitting for an email that is still unverified updates the pending account and re-sends the code, so a failed email can be retried.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict` per IP.
- **Body:** `studentId`, `department` (a department code such as `CSE`, `EEE`, `BBA`) and `batch` are optional.

```json
{
  "name": "Rahim Uddin",
  "email": "rahim@example.com",
  "password": "Campus2026x",
  "studentId": "CU-221-15-001",
  "department": "CSE",
  "batch": "59",
  "formToken": "<from /api/security/form-token>",
  "website": ""
}
```

- **Success (201):**

```json
{ "success": true, "data": { "message": "Account created. Enter the 6-digit code we sent to your email.", "email": "rahim@example.com", "otpExpiresInSeconds": 600, "resendCooldownSeconds": 60, "resendAvailableInSeconds": 60 } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Bad fields, weak or common password, unknown keys, unknown department |
| 400 | `BAD_REQUEST` | Missing, expired or too-fast `formToken`, or malformed JSON |
| 403 | `FORBIDDEN` | Bad Origin, or Turnstile failed |
| 409 | `CONFLICT` | The email is already verified, or the `studentId` is taken |
| 413 / 415 | | Body too large / not JSON |
| 429 | `RATE_LIMITED` | Rate limit hit |
| 503 | `EMAIL_DELIVERY_FAILED` | Brevo is unreachable. The account is kept. Retry signup or call resend-otp. |

#### `POST /api/auth/verify-email`

Verifies the signup OTP and signs the user in.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict`.
- **Body:**

```json
{ "email": "rahim@example.com", "code": "246810" }
```

- **Success (200):** sets the `campusos_session` cookie.

```json
{ "success": true, "data": { "message": "Email verified. You're now signed in.", "user": { "id": "cmuy…", "name": "Rahim Uddin", "email": "rahim@example.com", "role": "USER", "studentId": "CU-221-15-001", "batch": "59", "phone": null, "avatarUrl": null, "isEmailVerified": true, "createdAt": "2026-10-07T16:23:40.017Z", "department": { "id": "cmuy…", "code": "CSE", "name": "Computer Science & Engineering" } } } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_OTP` | Wrong or used code, unknown email, or account already verified |
| 400 | `OTP_EXPIRED` | Code expired |
| 400 | `OTP_ATTEMPTS_EXCEEDED` | 5 wrong guesses |
| 400 | `VALIDATION_ERROR` | Bad fields |
| 403 | `FORBIDDEN` | Bad Origin |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `POST /api/auth/resend-otp`

Sends a new code. Earlier codes for the same purpose stop working once the new one is delivered.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict` per IP, plus `otpPerEmail` and a 60 s cooldown.
- **Body:** `purpose` is `SIGNUP_VERIFY` or `PASSWORD_RESET`.

```json
{ "email": "rahim@example.com", "purpose": "SIGNUP_VERIFY" }
```

- **Success (200):** the same response whether or not anything was sent.

```json
{ "success": true, "data": { "message": "If this email needs a code, a new one has been sent.", "otpExpiresInSeconds": 600, "resendCooldownSeconds": 60 } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 429 | `RATE_LIMITED` | Cooldown active (`Retry-After` = seconds left) or per-email cap reached |
| 400 | `VALIDATION_ERROR` | Bad fields |
| 403 | `FORBIDDEN` | Bad Origin |
| 503 | `EMAIL_DELIVERY_FAILED` | Brevo unreachable |

#### `POST /api/auth/login`

Signs a user in with email and password.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict`, plus the login lockout.
- **Body:**

```json
{ "email": "rahim@example.com", "password": "Campus2026x", "website": "" }
```

- **Success (200):** sets the `campusos_session` cookie.

```json
{ "success": true, "data": { "message": "Signed in.", "user": { "id": "cmuy…", "name": "Rahim Uddin", "email": "rahim@example.com", "role": "USER", "...": "same shape as verify-email" } } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 401 | `INVALID_CREDENTIALS` | Any credential problem, always the same message |
| 403 | `EMAIL_NOT_VERIFIED` | Correct password, but the email is not verified. A new OTP is sent. |
| 429 | `RATE_LIMITED` | Locked out (`Retry-After` up to 900) or IP limit hit |
| 400 | `VALIDATION_ERROR` | Bad fields |
| 403 | `FORBIDDEN` | Bad Origin |

#### `POST /api/auth/admin/login`

The same as `/api/auth/login`, but only MODERATOR, CLUB_ADMIN, ADMIN and SUPER_ADMIN may sign in. Students get the generic `401 INVALID_CREDENTIALS`. A successful login writes an `auth.admin_login` row to the audit log. The request and response bodies have the same shape as login.

#### `POST /api/auth/forgot-password`

Starts a password reset.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict` per IP; `otpPerEmail` is applied silently.
- **Body:**

```json
{ "email": "rahim@example.com", "formToken": "<token>", "website": "" }
```

- **Success (200):** always identical. The lookup and email happen after the response is sent, so neither the response nor its timing reveals whether the account exists.

```json
{ "success": true, "data": { "message": "If an account exists for this email, we've sent a password reset code.", "otpExpiresInSeconds": 600 } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `BAD_REQUEST` | Bad or too-fast `formToken` |
| 400 | `VALIDATION_ERROR` | Bad fields |
| 403 | `FORBIDDEN` | Bad Origin, or Turnstile failed |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `POST /api/auth/reset-password`

Sets a new password using the reset code.

- **Auth:** none. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict`.
- **Body:**

```json
{ "email": "rahim@example.com", "code": "135790", "newPassword": "Campus2028z" }
```

- **Success (200):** clears the session cookie. All sessions are revoked, other codes are invalidated, and a "password changed" email is sent.

```json
{ "success": true, "data": { "message": "Password updated. Please sign in with your new password." } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_OTP` / `OTP_EXPIRED` / `OTP_ATTEMPTS_EXCEEDED` | Code problem |
| 400 | `VALIDATION_ERROR` | Weak password or bad fields |
| 403 | `FORBIDDEN` | Bad Origin |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `POST /api/auth/logout`

Signs out this device only.

- **Auth:** none required. **Headers:** `Origin`. **Body:** none.
- **Success (200):** sends `Set-Cookie: campusos_session=; Max-Age=0`.

```json
{ "success": true, "data": { "message": "Signed out." } }
```

- **Errors:** 403 `FORBIDDEN` (bad Origin).

#### `POST /api/auth/logout-all`

Signs out every device by incrementing `tokenVersion`.

- **Auth:** cookie. **Headers:** `Origin`. **Rate limit:** `write`. **Body:** none.
- **Success (200):** clears the cookie.

```json
{ "success": true, "data": { "message": "Signed out on all devices." } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 401 | `UNAUTHORIZED` | Not signed in |
| 403 | `FORBIDDEN` | Bad Origin |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `GET /api/auth/me`

Returns the signed-in user.

- **Auth:** cookie. **Headers:** none.
- **Success (200),** sent with `Cache-Control: private, no-store`:

```json
{ "success": true, "data": { "user": { "id": "cmuy…", "name": "Rahim Uddin", "email": "rahim@example.com", "role": "USER", "studentId": "CU-221-15-001", "batch": "59", "phone": null, "avatarUrl": null, "isEmailVerified": true, "createdAt": "2026-10-07T16:23:40.017Z", "department": { "id": "cmuy…", "code": "CSE", "name": "Computer Science & Engineering" } } } }
```

- **Errors:** 401 `UNAUTHORIZED` (no cookie; or an expired, revoked or deactivated session).

#### `PATCH /api/users/me`

Updates the signed-in user's profile.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `write`.
- **Body:** every field is optional, and `null` clears it. `name`, `studentId`, `department` (code), `batch`, `phone` and `avatarUrl` are allowed. `avatarUrl` must be your own image upload (`/api/upload/image` with `purpose=avatar`); a foreign or external URL returns `400 VALIDATION_ERROR`. Role, email and verification status cannot be changed here.

```json
{ "name": "Rahim Uddin", "phone": "+8801711000000", "department": "EEE" }
```

- **Success (200):**

```json
{ "success": true, "data": { "user": { "id": "cmuy…", "name": "Rahim Uddin", "phone": "+8801711000000", "department": { "code": "EEE", "name": "Electrical & Electronic Engineering", "id": "cmuy…" }, "...": "full profile" } } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Unknown keys, unknown department, or empty body |
| 401 | `UNAUTHORIZED` | Not signed in |
| 403 | `FORBIDDEN` | Bad Origin |
| 409 | `CONFLICT` | `studentId` is taken |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### `POST /api/users/me/change-password`

Changes the password and signs out every other device.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `authStrict`.
- **Body:**

```json
{ "currentPassword": "Campus2026x", "newPassword": "Campus2027y" }
```

- **Success (200):** this device receives a fresh cookie, other devices are signed out, and a "password changed" email is sent.

```json
{ "success": true, "data": { "message": "Password changed. Other devices have been signed out." } }
```

- **Errors:**

| Status | Code | When |
| --- | --- | --- |
| 400 | `INVALID_CURRENT_PASSWORD` | Current password is wrong |
| 400 | `VALIDATION_ERROR` | Weak password, or same as the current one |
| 401 | `UNAUTHORIZED` | Not signed in |
| 403 | `FORBIDDEN` | Bad Origin |
| 429 | `RATE_LIMITED` | Rate limit hit |

#### Protected route prefixes (`src/proxy.ts`)

| Path | No/invalid session | Signed in, not staff |
| --- | --- | --- |
| `/admin/*` (except `/admin/login`) | 307 → `/admin/login?next=…` | 307 → `/admin/login?next=…` |
| `/api/admin/*` | 401 `UNAUTHORIZED` (JSON) | 403 `FORBIDDEN` (JSON) |
| `/dashboard/*`, `/profile/*`, `/settings/*`, `/my/*`, `/notifications/*` | 307 → `/login?next=…` | allowed |

The proxy only verifies the JWT. Route handlers repeat the full check against the database.

### List conventions (all modules)

- **Pagination:** `?cursor=<opaque>&limit=1..50` (default 20). Responses carry `meta: { "limit": 20, "nextCursor": "…" | null }`. Pass `nextCursor` back as `cursor` to get the next page; `null` means the last page. Cursors are keyset-based, never OFFSET. A malformed resource-search cursor returns `400 VALIDATION_ERROR`.
- **Empty query values** (`?q=`) are ignored. Unknown query parameters are rejected (`400 VALIDATION_ERROR`).
- **Ids** are Prisma cuids (`c` + 20–32 lowercase alphanumerics). A malformed id returns `400 VALIDATION_ERROR` before any database work.
- **Times** in request bodies are ISO-8601 with an offset (`2026-11-02T15:00:00+06:00`). Responses are UTC ISO strings. Campus calendar maths (week, month) uses Asia/Dhaka.

Module error codes:

| Code | Status | Meaning |
| --- | --- | --- |
| `EVENT_NOT_OPEN` | 409 | The event is a draft, cancelled or completed |
| `EVENT_ENDED` | 409 | The event has already ended |
| `REGISTRATION_CLOSED` | 409 | Past the registration deadline (or the start time if there is no deadline) |
| `ALREADY_REGISTERED` | 409 | An active registration already exists |
| `EVENT_FULL` | 409 | Capacity is reached (checked atomically) |
| `TICKET_NOT_FOUND` | 404 | The QR token is unknown |
| `WRONG_EVENT` | 409 | The ticket belongs to another event |
| `REGISTRATION_CANCELLED` | 409 | The ticket's registration was cancelled |
| `ALREADY_CHECKED_IN` | 409 | Already checked in (`details.checkedInAt`) |
| `EVENT_NOT_ACTIVE` | 409 | Check-in at a draft or cancelled event |
| `CHECKIN_NOT_OPEN` / `CHECKIN_CLOSED` | 409 | Outside the door window (3 h before start to 3 h after end) |
| `IMAGE_PROCESSING_FAILED` | 422 | The image is corrupt or could not be compressed. The raw file is never uploaded. |
| `IMAGE_QUEUE_FULL` | 503 | The compression queue is saturated. Retry shortly. |
| `UPLOAD_FAILED` / `UPLOAD_DELETE_FAILED` | 503 | UploadThing is unavailable. Safe to retry. |

Additional rate-limit tiers: **`upload`** (DB) allows 20 per 10 min per IP for image uploads, PDF upload requests and resource submissions. **Check-in** (DB) allows 240 per minute per IP, because door scanners send requests in bursts. Event and resource search with `q` uses the `search` tier. Other public reads use `publicRead`.

### Uploads

Every file URL stored in the database must come from this pipeline. Stored URLs must be `https://<app>.ufs.sh/f/<key>` (or legacy `https://utfs.io/f/<key>`), the key must exist in `UploadedFile`, and it must belong to the caller. Admins may reuse any tracked image. Anything else is rejected with `400 VALIDATION_ERROR`, using the real field name in `details[].path` (for example `bannerUrl` or `fileUrl`).

#### `POST /api/upload/image`

Compresses an image server-side and stores it on UploadThing.

- **Auth:** cookie (any signed-in user). **Headers:** `Origin`, `Content-Type: multipart/form-data`. **Rate limit:** `upload`.
- **Form fields:**
  - `file` (required): JPEG, PNG, WebP, AVIF or GIF, at most 4 MB. The real type is checked by magic bytes, not the extension.
  - `purpose` (optional): one of `general` (default), `avatar`, `event-banner`, `club-logo`, `lost-found`, `complaint`, `resource-thumbnail`.

  ```bash
  curl -X POST /api/upload/image -H "Origin: https://app" -b cookies -F "file=@banner.jpg" -F "purpose=event-banner"
  ```
- **Pipeline:**
  1. Auth and rate limit.
  2. Magic-byte check.
  3. If the image exceeds the purpose's bounds, sharp resizes it to fit (EXIF orientation is applied, and the result is never upscaled).
  4. `image-video-compressor` compresses it (`format: "auto"`, quality 80, metadata stripped).
  5. `UTApi.uploadFiles` uploads it.
  6. An `UploadedFile` row is saved.

  The bounds per purpose are: avatar and club-logo 512², resource-thumbnail 800², event-banner 1920×1080, everything else 1600².
- **Success (201):** `url` is the value to store in `bannerUrl`, `logoUrl` and similar fields.

  ```json
  { "success": true, "data": { "url": "https://wqsc48wcpm.ufs.sh/f/oNCr…", "key": "oNCr…", "size": 18088, "originalSize": 530332, "compressionRatio": "96.6%", "mimeType": "image/webp", "width": 1620, "height": 1080 } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `BAD_REQUEST` | No `file` field |
  | 400 | `VALIDATION_ERROR` | Bad `purpose` |
  | 401 | `UNAUTHORIZED` | Not signed in |
  | 403 | `FORBIDDEN` | Bad Origin |
  | 413 | `PAYLOAD_TOO_LARGE` | Over 4 MB, or too many pixels |
  | 415 | `UNSUPPORTED_MEDIA_TYPE` | Not an allowed image, or not multipart |
  | 422 | `IMAGE_PROCESSING_FAILED` | Corrupt image |
  | 429 | `RATE_LIMITED` | Rate limit hit |
  | 503 | `UPLOAD_FAILED` / `IMAGE_QUEUE_FULL` | Storage or queue unavailable |

#### `GET | POST /api/uploadthing` (UploadThing FileRouter, route `pdfUploader`)

PDFs go straight from the browser to UploadThing, which avoids the serverless body limit. Use `@uploadthing/react` with `endpoint="pdfUploader"`.

- **Limits:** PDF only, at most 16 MB, 1 file.
- **Auth:** the FileRouter `middleware` requires a valid session (otherwise `403 {"message":"Sign in to upload files."}`) and applies the `upload` rate limit.
- **`onUploadComplete`:** re-reads the stored file's first bytes, which must be `%PDF-`. If they aren't, the file is deleted from UploadThing and rejected. Otherwise it records an `UploadedFile` (kind `PDF`, owned by the uploader) and returns `{ url, key }` to the client.
- **Next step:** send that `url` and `key` to `POST /api/resources`.
- **Errors:** wrong type returns `400 {"message":"Invalid config: InvalidFileType"}`; too large returns `TOO_LARGE`.
- **Production note:** UploadThing calls back to `/api/uploadthing`, so the deployment URL must be publicly reachable. Local `next dev` uses UploadThing's dev stream instead.

#### `DELETE /api/upload/{key}`

Deletes an uploaded file from UploadThing (`UTApi.deleteFiles`) and from `UploadedFile`.

- **Auth:** cookie. The caller must be the owner or ADMIN+. **Headers:** `Origin`. **Rate limit:** `write`.
- **Success (200):**

  ```json
  { "success": true, "data": { "message": "File deleted.", "key": "oNCr…" } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Bad key format |
  | 401 | `UNAUTHORIZED` | Not signed in |
  | 403 | `FORBIDDEN` | Not the owner |
  | 404 | `NOT_FOUND` | Unknown key |
  | 409 | `CONFLICT` | Still attached to a live resource |
  | 503 | `UPLOAD_DELETE_FAILED` | UploadThing unavailable |

Orphan cleanup: `npm run uploads:cleanup` lists tracked uploads older than 24 h that no user, club, event, resource, notice, lost & found item or complaint references. Add `-- --apply` to delete them from UploadThing and the database.

### Module 1: Clubs & events

#### `GET /api/clubs`

The active club directory, alphabetical.

- **Auth:** none. **Cached:** tag `clubs`.
- **Query:** `category?` (a `ClubCategory`), `q?` (name contains), `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "cmuybdskx…", "name": "CU Blood Donors & Social Welfare Club", "slug": "cu-blood-donors-club", "description": "…", "logoUrl": null, "coverUrl": null, "category": "SOCIAL_SERVICE", "memberCount": 0 } ], "meta": { "limit": 3, "nextCursor": "cmuybdr6q…" } }
  ```

- **Errors:** 400 `VALIDATION_ERROR`, 429.

#### `GET /api/clubs/{slug}`

A club profile with its next 6 published events.

- **Auth:** none. **Cached:** tags `clubs`, `club:{id}` and `events`.
- **Success (200):**

  ```json
  { "success": true, "data": { "id": "…", "name": "CU Computer Club", "slug": "cu-computer-club", "category": "TECHNOLOGY", "memberCount": 1, "upcomingEvents": [ { "id": "…", "title": "Hands-on Git & GitHub Workshop", "startAt": "2026-10-10T08:00:00.000Z", "spotsLeft": 59 } ] } }
  ```

- **Errors:** 400 (bad slug), 404 `NOT_FOUND`.

#### `GET /api/events`

The public event feed, sorted by `startAt` (newest first for `when=past`).

- **Auth:** none. **Cached:** tag `events`. The cache key includes an hourly "now" bucket.
- **Query:**
  - `when`: `upcoming` (default), `thisWeek` (the Dhaka Friday–Thursday week), `past` or `all`.
  - `clubId?`, `clubSlug?`, `type?` (`WORKSHOP|CONTEST|SEMINAR|CULTURAL|SPORTS|MEETUP|OTHER`).
  - `dateFrom?`, `dateTo?` (ISO with offset; filters `startAt`).
  - `q?` (title or venue contains), `cursor?`, `limit?`.

  Example: `GET /api/events?when=thisWeek&type=WORKSHOP&limit=10`
- **Success (200):** event cards.

  ```json
  { "success": true, "data": [ { "id": "cmuycrmu2…", "title": "Acoustic Night", "slug": "acoustic-night", "type": "CULTURAL", "status": "PUBLISHED", "startAt": "2026-10-13T11:30:00.000Z", "endAt": "2026-10-13T14:30:00.000Z", "venue": "Cafeteria Lawn", "bannerUrl": null, "capacity": 150, "registrationCount": 1, "registrationDeadline": null, "spotsLeft": 149, "club": { "id": "…", "name": "CU Cultural Club", "slug": "cu-cultural-club", "logoUrl": null } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

- **Errors:** 400 `VALIDATION_ERROR` (bad enum or date, or `dateFrom >= dateTo`), 429.

#### `GET /api/events/calendar?month=YYYY-MM`

Lightweight month view in the Dhaka calendar. Includes published, completed and cancelled events (so the UI can strike cancelled ones out). Returns at most 500 events.

- **Auth:** none. **Cached:** tags `events` and `calendar`.
- **Success (200):**

  ```json
  { "success": true, "data": { "month": "2026-10", "events": [ { "id": "…", "title": "Debate 101: Parliamentary Format", "slug": "debate-101-parliamentary-format", "type": "WORKSHOP", "status": "PUBLISHED", "startAt": "…", "endAt": "…", "venue": "Room 305, Academic Building 1", "club": { "name": "CU Debating Society", "slug": "cu-debating-society" } } ] } }
  ```

- **Errors:** 400 (bad month).

#### `GET /api/events/{slug}`

The event page. Drafts return 404.

- **Auth:** none. **Cached:** tags `events` and `event:{id}`. The `registration` block is computed live on each request.
- **Success (200):**

  ```json
  { "success": true, "data": { "id": "…", "title": "Mock Interview Day", "description": "…", "capacity": 5, "registrationCount": 2, "spotsLeft": 3, "status": "PUBLISHED", "club": { "name": "CU Career Development Club", "category": "ACADEMIC", "description": "…" }, "registration": { "closesAt": "2026-10-21T04:00:00.000Z", "isOpen": true, "blocker": null } } }
  ```

- **Errors:** 400 (bad slug), 404 `NOT_FOUND`.

#### `POST /api/events/{eventId}/register`

Registers the signed-in user for an event.

- **Auth:** cookie. **Headers:** `Origin`. **Rate limit:** `write`. **Body:** none.
- **What happens:**
  - The seat is claimed with one conditional `UPDATE … WHERE registrationCount < capacity` inside a transaction, so concurrent requests can never overbook. In testing, 10 parallel requests for 3 seats produced exactly 3 registrations and 7 `EVENT_FULL`.
  - The user gets a fresh `qrToken` (`nanoid(32)`), an in-app notification, and a confirmation email (sent after the response) with the QR PNG attached.
- **Success (201):**

  ```json
  { "success": true, "data": { "message": "You're registered. Your QR ticket has been emailed to you.", "registration": { "id": "cmuyd2b5t…", "status": "REGISTERED", "checkedInAt": null, "createdAt": "…", "event": { "id": "…", "title": "Acoustic Night", "registrationCount": 1, "…": "event card" } } } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Bad id |
  | 401 | `UNAUTHORIZED` | Not signed in |
  | 403 | `FORBIDDEN` | Bad Origin |
  | 404 | `NOT_FOUND` | Unknown event |
  | 409 | `EVENT_NOT_OPEN` / `EVENT_ENDED` / `REGISTRATION_CLOSED` / `ALREADY_REGISTERED` / `EVENT_FULL` | See the module error codes above |
  | 429 | `RATE_LIMITED` | Rate limit hit |

#### `DELETE /api/events/{eventId}/register`

Cancels the user's registration before the event starts and frees the seat.

- **Auth:** cookie. **Headers:** `Origin`.
- **Success (200):**

  ```json
  { "success": true, "data": { "message": "Registration cancelled." } }
  ```

- **Errors:** 404 (no active registration), 409 (the event has started), 401, 403.

#### `POST | DELETE /api/events/{eventId}/save`

Bookmarks or un-bookmarks an event. Both calls are idempotent.

- **Auth:** cookie. **Headers:** `Origin`.
- **Success (200):**

  ```json
  { "success": true, "data": { "saved": true, "eventId": "…" } }
  ```

- **Errors:** 404 (unknown or draft event), 401, 403.

#### `GET /api/me/registrations`

The user's registrations, newest first.

- **Auth:** cookie. **Query:** `status?` (`REGISTERED|CHECKED_IN|CANCELLED`), `cursor?`, `limit?`. **Response header:** `Cache-Control: private, no-store`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "status": "CHECKED_IN", "checkedInAt": "…", "createdAt": "…", "event": { "title": "ICPC Dhaka Regional Prep Contest", "…": "event card" } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

- **Errors:** 401.

#### `GET /api/me/registrations/{id}/qr`

The owner's QR ticket. The QR encodes the opaque `qrToken`.

- **Auth:** cookie. Only the owner can fetch it; anyone else gets 404.
- **Query:** `format=json` (default) or `format=png`.
- **Success (200), JSON:**

  ```json
  { "success": true, "data": { "registrationId": "…", "status": "REGISTERED", "qrDataUrl": "data:image/png;base64,iVBORw0KGgo…" } }
  ```

  With `format=png`, the response is `image/png` bytes.
- **Errors:** 401; 404 (not found or not yours); 409 (cancelled).

#### `GET /api/me/saved-events`

The user's saved events, newest first.

- **Auth:** cookie. **Query:** `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "createdAt": "…", "event": { "…": "event card" } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### Admin: clubs (`/api/admin/clubs`)

ADMIN and SUPER_ADMIN hold `clubs:manage`. A CLUB_ADMIN can list and edit only their own clubs. All mutations are audited and revalidate `clubs`, `club:{id}`, `events`, `calendar`, `forms` and `stats`.

| Method & path | Permission | Body / query | Success |
| --- | --- | --- | --- |
| `GET /api/admin/clubs` | `events:manage` | `q?`, `includeInactive?`, `cursor?`, `limit?` | 200: list with `_count.events` |
| `POST /api/admin/clubs` | `clubs:manage` | `{ "name": "CU Chess Club", "description": "…", "category": "OTHER", "slug?": "cu-chess-club", "logoUrl?": "<upload url>", "coverUrl?": "…", "isActive?": true }` | 201: the club (slug auto-generated if omitted) |
| `PATCH /api/admin/clubs/{id}` | `events:manage` + club scope | Any create field. A CLUB_ADMIN may only change `description`, `logoUrl`, `coverUrl` and `category`. | 200: the club |
| `DELETE /api/admin/clubs/{id}` | `clubs:manage` | none | 200: `{ "message": "Club deleted.", "id": "…" }` (soft delete) |

Errors: 400 `VALIDATION_ERROR` (including a foreign or external `logoUrl`); 403 (missing permission, another club, or a forbidden field such as `"Club admins cannot change: name, isActive."`); 404; 409 (duplicate name or slug, or deleting a club that still has upcoming events).

#### Admin: events (`/api/admin/events`)

Requires `events:manage` (CLUB_ADMIN, ADMIN, SUPER_ADMIN). A CLUB_ADMIN only sees and manages their own clubs' events. Every mutation is audited and revalidates `events`, `calendar`, `stats` and `event:{id}`.

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/events` | `status?`, `clubId?`, `q?`, `cursor?`, `limit?` | 200: events in any status, newest start first |
| `POST /api/admin/events` | See the example below. An event that starts on Wednesday or Thursday (Dhaka) also needs `"confirmOffDay": true`, otherwise the API answers `422 OFF_DAY_CONFIRMATION_REQUIRED`. | 201: the event (`DRAFT`, or `PUBLISHED` with `"publish": true`) |
| `GET /api/admin/events/{id}` | none | 200: the event, including `createdBy` |
| `PATCH /api/admin/events/{id}` | Any field from the create body (all optional). Moving an event onto a Wednesday or Thursday needs `confirmOffDay: true` too. | 200. If the time or venue of a published event changes, registrants are notified in-app and by bulk email. |
| `POST /api/admin/events/{id}/publish` | none | 200: `DRAFT` → `PUBLISHED` |
| `POST /api/admin/events/{id}/cancel` | `{ "reason": "Lab maintenance - we will reschedule soon." }` | 200: `CANCELLED`. Registrants are notified with the reason. |
| `DELETE /api/admin/events/{id}` | none | 200 (soft delete). Refused (409) for a published event that has registrations; cancel it first. |

Create body:

```json
{
  "title": "Hands-on Git & GitHub Workshop",
  "description": "Learn branching and pull requests…",
  "clubId": "cmuybdpc5…",
  "type": "WORKSHOP",
  "startAt": "2026-11-02T15:00:00+06:00",
  "endAt": "2026-11-02T18:00:00+06:00",
  "venue": "Computer Lab 3",
  "capacity": 60,
  "registrationDeadline": "2026-11-01T23:59:00+06:00",
  "bannerUrl": "https://<app>.ufs.sh/f/<key from /api/upload/image>",
  "publish": false
}
```

Errors:
- 400 `VALIDATION_ERROR`: `endAt <= startAt`, a deadline after the start, an unknown or inactive club, a foreign or external `bannerUrl`, or unknown keys such as `status` or `registrationCount`.
- 403: another club.
- 404: unknown event.
- 409: publishing a non-draft or an event that has ended, editing a cancelled or completed event, `capacity` below the current registrations, or deleting a published event that has registrations.

Attendee notifications run after the response. In-app rows are inserted 1,000 at a time, and emails go out in Brevo `messageVersions` batches of 500.

#### `GET /api/admin/events/{id}/registrations`

A searchable attendee list.

- **Permission:** `events:checkin`, with club scope. **Query:** `status?`, `q?` (name, email or student ID), `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "status": "CHECKED_IN", "createdAt": "…", "checkedInAt": "…", "user": { "id": "…", "name": "Demo Student", "email": "…", "studentId": "CU-DEMO-001", "batch": "58", "department": { "code": "CSE" } } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### `GET /api/admin/events/{id}/registrations/export`

Streams every registration as CSV, in batches of 1,000.

- **Permission:** `events:manage`, with club scope. Moderators get 403.
- **Success (200):** `text/csv; charset=utf-8` with a BOM for Excel and `Content-Disposition: attachment`. Columns: `Name, Email, Student ID, Department, Batch, Status, Registered At, Checked In At`. Cells are protected against formula injection (a leading `= + - @` is prefixed with `'`). The export is audited.

#### `GET /api/admin/events/{id}/stats`

Attendance numbers for one event.

- **Permission:** `events:checkin`, with club scope.
- **Success (200):**

  ```json
  { "success": true, "data": { "eventId": "…", "capacity": 40, "registered": 2, "checkedIn": 2, "cancelled": 1, "fillRate": 0.05, "noShowRate": null } }
  ```

  `noShowRate` is `(registered − checkedIn) / registered` and only appears once the event has ended.

#### `POST /api/admin/checkin`

Checks in an attendee by scanning their QR code.

- **Permission:** `events:checkin`. MODERATOR, ADMIN and SUPER_ADMIN can check in at any event; a CLUB_ADMIN only at their own clubs. Access to the door's event is checked **before** the ticket is looked up. **Rate limit:** 240/min.
- **Body:**

  ```json
  { "qrToken": "<32-char token decoded from the QR>", "eventId": "<event at this door>" }
  ```

- **Success (200):** the ticket moves `REGISTERED` → `CHECKED_IN` exactly once, through a conditional update, so racing scanners can't both succeed.

  ```json
  { "success": true, "data": { "registrationId": "…", "checkedInAt": "2026-10-07T17:11:06.887Z", "attendee": { "id": "…", "name": "Demo Student", "email": "…", "studentId": "CU-DEMO-001", "avatarUrl": null, "department": { "code": "CSE" } }, "event": { "id": "…", "title": "Live Demo Workshop" } } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Bad token or id |
  | 403 | `FORBIDDEN` | Another club's door |
  | 404 | `TICKET_NOT_FOUND` | Unknown token |
  | 409 | `WRONG_EVENT` / `REGISTRATION_CANCELLED` / `ALREADY_CHECKED_IN` (with `details.checkedInAt`) / `EVENT_NOT_ACTIVE` / `CHECKIN_NOT_OPEN` / `CHECKIN_CLOSED` | See the module error codes above |

#### `POST /api/admin/events/{id}/registrations/{registrationId}/checkin`

Manual check-in by registration id, for an attendee without their phone. It uses the same rules, response and errors as QR check-in.

### Module 2: Resource hub

#### `GET /api/departments`

All departments with course counts.

- **Auth:** none. **Cached:** tag `departments`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "code": "CSE", "name": "Computer Science & Engineering", "faculty": "Faculty of Science & Engineering", "_count": { "courses": 8 } } ] }
  ```

#### `GET /api/courses`

Courses, ordered by semester and then code (at most 500).

- **Auth:** none. **Cached:** tags `courses` and `department:{id}`. **Query:** `departmentId?`, `semester?` (1–12).
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "code": "CSE-3201", "title": "Operating Systems", "semester": 6, "credits": 3, "department": { "id": "…", "code": "CSE" } } ] }
  ```

#### `GET /api/resources`

Lists and searches approved resources.

- **Auth:** none. **Cached:** tag `resources`. **Rate limit:** `search` when `q` is set, otherwise `publicRead`.
- **Query:**
  - `q?` (search text).
  - `departmentId?`, `courseId?`, `semester?`, `year?`, `type?` (`NOTES|QUESTION_PAPER|LAB_MANUAL|NOTICE|OTHER`).
  - `sort`: `relevance` (default; falls back to `newest` without `q`), `newest` or `popular`.
  - `cursor?`, `limit?`.

  Example: `GET /api/resources?q=CSE%202101&departmentId=…&sort=relevance`
- **Search:** one parameterized SQL query (`$queryRaw`; user text is never concatenated into SQL) that matches any of:
  - weighted full-text search (title and tags weight A, description weight B), against the query and its synonym and acronym expansions (`prev` → previous, `dbms` → database management, `os` → operating systems…);
  - `pg_trgm` `word_similarity` for typos (`algoritms` → *Algorithms*);
  - punctuation-insensitive course codes (`CSE 2101` = `cse-2101` = `CSE2101`);
  - course titles.

  Results are ranked: an exact full-text match first, then an any-term match, then title similarity, then a course hit.
- **Success (200):** `score` appears only for `sort=relevance` with a query. The file URL is **not** included; use the download endpoint.

  ```json
  { "success": true, "data": [ { "id": "…", "title": "CSE-2101 Class Test Questions (2023)", "description": "…", "type": "QUESTION_PAPER", "semester": 3, "year": 2023, "tags": ["cse-2101", "class test", "ct"], "fileSize": 1024, "downloadCount": 111, "bookmarkCount": 0, "isSample": true, "createdAt": "…", "department": { "id": "…", "code": "CSE", "name": "Computer Science & Engineering" }, "course": { "id": "…", "code": "CSE-2101", "title": "Data Structures" }, "score": 2.393 } ], "meta": { "limit": 20, "nextCursor": "eyJ2Ijo…" } }
  ```

- **Errors:** 400 `VALIDATION_ERROR` (bad filter, or a malformed `cursor`), 429.

#### `GET /api/resources/{id}`

The resource page. Only approved resources are visible.

- **Auth:** none. **Cached:** tags `resources`, `resource:{id}`, `course:{id}` and `department:{id}`.
- **Success (200):**

  ```json
  { "success": true, "data": { "id": "…", "title": "…", "type": "QUESTION_PAPER", "fileSize": 1024, "mimeType": "application/pdf", "downloadCount": 113, "bookmarkCount": 0, "department": { "code": "CSE" }, "course": { "code": "CSE-2101", "title": "Data Structures", "semester": 3 }, "uploadedBy": { "name": "CampusOS Super Admin" } } }
  ```

- **Errors:** 400, 404 (unknown, pending, rejected or deleted).

#### `POST /api/resources/{id}/download`

Returns the file URL and counts the download, at most once per user per resource per 24 h.

- **Auth:** cookie. **Headers:** `Origin`. **Rate limit:** `write`.
- **Success (200):**

  ```json
  { "success": true, "data": { "fileUrl": "https://wqsc48wcpm.ufs.sh/f/…", "downloadCount": 112 } }
  ```

- **Errors:** 401, 403, 404.

#### `POST | DELETE /api/resources/{id}/bookmark`

Bookmarks or un-bookmarks a resource. Both calls are idempotent; `bookmarkCount` only changes when a row is actually created or removed.

- **Auth:** cookie. **Headers:** `Origin`.
- **Success (200):**

  ```json
  { "success": true, "data": { "bookmarked": true, "resourceId": "…" } }
  ```

- **Errors:** 401, 403, 404.

#### `GET /api/me/bookmarks`

Bookmarked resources that are still approved.

- **Auth:** cookie. **Query:** `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "createdAt": "…", "resource": { "id": "…", "title": "…", "type": "NOTES", "downloadCount": 12, "department": { "code": "CSE" }, "course": { "code": "CSE-3101", "title": "Database Management Systems" } } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### `POST /api/resources`

Submits a resource. Upload the PDF first through the FileRouter.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `upload`.
- **Body:** `courseId`, `semester`, `year`, `description` and `tags` (at most 10, lower-cased and de-duplicated) are optional.
- **Custom course:** if the course is not in the catalogue send `courseName` (2–120 characters, free text such as `"CSE 4101 · Machine Learning"`) instead of `courseId`; sending both returns 400. The name is shown on the card and detail page, and is also added as a search tag.

  ```json
  {
    "title": "DBMS Complete Notes (Normalization to Transactions)",
    "description": "Typed notes covering ER modelling, normal forms, SQL and transactions.",
    "type": "NOTES",
    "departmentId": "…",
    "courseId": "…",
    "semester": 5,
    "year": 2026,
    "tags": ["dbms", "sql"],
    "fileUrl": "https://<app>.ufs.sh/f/<key>",
    "fileKey": "<key>",
    "fileSize": 645,
    "mimeType": "application/pdf"
  }
  ```

- **Checks:**
  - The URL is on a trusted host, and `fileKey` matches it.
  - The key is tracked in `UploadedFile` as `PDF` and **owned by the caller**.
  - `fileSize` and `mimeType` match what was recorded.
  - The course belongs to the department.
  - The file is not already attached to another resource.
- **Success (201):** status is `PENDING` for students. Staff uploads are auto-`APPROVED` and revalidate the `resources` tags.

  ```json
  { "success": true, "data": { "message": "Thanks! Your resource is waiting for moderator review.", "resource": { "id": "…", "title": "…", "type": "NOTES", "status": "PENDING", "rejectionReason": null, "reviewedAt": null, "downloadCount": 0, "createdAt": "…", "department": { "code": "CSE" }, "course": { "code": "CSE-3101" } } } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | External or foreign file, size mismatch, course outside the department, or a bad field |
  | 401 | `UNAUTHORIZED` | Not signed in |
  | 403 | `FORBIDDEN` | Bad Origin |
  | 409 | `CONFLICT` | The file is already used by another resource |
  | 413 / 415 | | Body too large / not JSON |
  | 429 | `RATE_LIMITED` | Rate limit hit |

#### `GET /api/me/resources`

The user's own uploads with their moderation status and rejection reason.

- **Auth:** cookie. **Query:** `status?` (`PENDING|APPROVED|REJECTED`), `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "title": "…", "type": "LAB_MANUAL", "status": "REJECTED", "rejectionReason": "Scanned pages are unreadable - please upload a clearer copy.", "reviewedAt": "…", "downloadCount": 0, "createdAt": "…", "department": { "code": "CE" }, "course": { "code": "CE-2201" } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### Admin: resource moderation (`resources:moderate`, held by MODERATOR, ADMIN and SUPER_ADMIN)

Every mutation is audited. Approve, update and delete revalidate `resources`, `resource:{id}`, `course:{id}`, `department:{id}` and `stats`.

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/resources` | `status` (default `PENDING`, oldest first), `departmentId?`, `q?`, `cursor?`, `limit?` | 200: items include `fileUrl` and `mimeType` for previewing and `uploadedBy { name, email, studentId }`. The console shows a preview only when the file is a PDF or an image. |
| `PATCH /api/admin/resources/{id}/review` | `{ "decision": "APPROVE" }` or `{ "decision": "REJECT", "reason": "Scanned pages are unreadable." }` | 200: the resource. The uploader gets a notification and an email. |
| `PATCH /api/admin/resources/{id}` | Any of `title`, `description`, `type`, `courseId`, `departmentId`, `semester`, `year`, `tags` | 200: the resource |
| `DELETE /api/admin/resources/{id}` | none | 200: `{ "message": "Resource deleted.", "id": "…" }` (soft delete) |

Errors: 400 (a reject without `reason`, a bad field, or a course outside the department); 403 (CLUB_ADMIN or student); 404; 409 (reviewing a resource that isn't `PENDING`).

#### Admin: departments & courses (`academics:manage`, held by ADMIN and SUPER_ADMIN)

| Method & path | Body | Success |
| --- | --- | --- |
| `POST /api/admin/departments` | `{ "code": "ARCH", "name": "Architecture", "faculty": "Faculty of Science & Engineering" }` (code is stored upper-case) | 201: the department |
| `PATCH /api/admin/departments/{id}` | Any create field | 200 |
| `DELETE /api/admin/departments/{id}` | none | 200. 409 if it is still referenced (`"Department is still referenced by: courses, resources, users."`) |
| `POST /api/admin/courses` | `{ "code": "arch 1101", "title": "Basic Design Studio", "departmentId": "…", "semester": 1, "credits": 3 }` | 201. The code is stored canonically (`ARCH-1101`). |
| `PATCH /api/admin/courses/{id}` | Any create field | 200 |
| `DELETE /api/admin/courses/{id}` | none | 200. 409 if any resources use the course (notices are unlinked automatically). |

Errors: 400 `VALIDATION_ERROR`; 403 (MODERATOR and below); 404; 409 (a duplicate code, or still in use). Every mutation revalidates `departments`, `courses`, `resources`, `notices`, `department:{id}` and `course:{id}`.

### Module 3: Smart helpdesk & chatbot

#### Chatbot rules

- **Grounded only.** The assistant answers **only from CampusOS data**: either deterministic intents built from live tables, or the knowledge base. It never invents information.
- **Pipeline:**
  1. Normalize the message: lower-case, strip punctuation, and map English, Banglish and Bangla vocabulary to canonical terms using `src/config/chatbot-synonyms.ts`. For example "porikkha", "পরীক্ষা" and "final" all become `exam`.
  2. Detect a **structured intent**: next bus (route/stop, Asia/Dhaka time), today's buses, open forms, events in the next 7 days, or the latest class cancellations. These are answered from `BusTrip`, `FormLink`, `Event` and `Notice` with `confidence: 1`.
  3. Otherwise, **retrieve** the top 8 KB entries with Postgres full-text search (`ts_rank_cd`), `pg_trgm` `word_similarity` and keyword-array overlap. All SQL is parameterized, and user text is never concatenated into SQL.
  4. **Confidence** blends those signals with *coverage*, meaning the share of the question's meaning units the entry actually addresses. An entry must cover at least a third of them, and question form (when/where/how) adds a small ranking bonus.
     - **HIGH (≥ 0.50):** the stored answer, its sources and page links.
     - **MEDIUM (≥ 0.30):** the closest answer plus "Did you mean…" suggestions.
     - **LOW:** the fixed reply "I don't have verified information about this yet" plus the 3 closest FAQs. The question is logged for admins.
  5. **Optional LLM** (only if `LLM_API_KEY` is set; Claude via `@anthropic-ai/sdk`): for HIGH or MEDIUM only, the retrieved entries and the question are sent with a strict "answer only from the context, otherwise reply NO_ANSWER" system prompt, a 3 s timeout and no retries. Any failure, refusal, empty or `NO_ANSWER` output falls back to the template answer. The bot is fully functional without a key. Server-side refusal fallback (`fallbacks: "default"`) is enabled.
- **Sample data:** answers from sample entries end with *"Note: this answer is from sample data and must be verified with the relevant office."*

#### `GET /api/helpdesk/entries`

Lists published FAQ entries.

- **Auth:** none. **Cached:** tag `kb`.
- **Query:** `category?` (`BUS|RULES|EXAM|ADMISSION|GENERAL|FAQ`), `q?`, `cursor?`, `limit?`. Without `q`, entries are sorted by category then question and cursor-paginated. With `q`, the chatbot's ranked retrieval returns the top 20 (`nextCursor: null`).
- **Success (200):** `sourceType` is `MANUAL|IMPORT|BUS_ROUTE|NOTICE|…`. `BUS_ROUTE` and `NOTICE` entries are auto-synced.

  ```json
  { "success": true, "data": [ { "id": "…", "category": "BUS", "question": "Are bus timings different during exams?", "answer": "…", "keywords": ["bus", "exam"], "isSample": true, "sourceType": "MANUAL", "updatedAt": "…" } ], "meta": { "limit": 20, "nextCursor": "…" } }
  ```

- **Errors:** 400 `VALIDATION_ERROR`, 429.

#### `GET /api/helpdesk/categories`

Category counts for the FAQ page.

- **Auth:** none. **Cached:** tag `kb`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "category": "BUS", "count": 16 }, { "category": "EXAM", "count": 16 } ] }
  ```

#### `GET /api/helpdesk/entries/{id}`

One published entry. `viewCount` is incremented after the response (via `after()`) and is not part of the payload.

- **Auth:** none. **Cached:** tags `kb` and `kb:{id}`.
- **Success (200):** the entry object, as above.
- **Errors:** 400, 404.

#### `POST /api/chatbot/message`

Asks the campus assistant.

- **Auth:** optional. Anonymous visitors are limited to **10/min per IP**; signed-in users to **30/min**. **Headers:** `Origin`, `Content-Type: application/json`.
- **Body:** omit `sessionId` to start a session. The returned `sessionId` is an unguessable 32-character token. `message` is at most 500 characters.

  ```json
  { "sessionId": "abC8sI…", "message": "mirpur er porer bus kokhon?" }
  ```

- **Success (200), intent answer:**

  ```json
  { "success": true, "data": { "sessionId": "abC8sI…", "messageId": "cmuy…", "answer": "Next R2 Mirpur buses at Mirpur 10:\n• 07:15 tomorrow - to campus\n…", "level": "HIGH", "confidence": 1, "intent": "NEXT_BUS", "answeredBy": "intent", "sources": [ { "id": "/bus?route=R2", "title": "Route R2 - Mirpur", "category": "GENERAL", "link": "/bus?route=R2" } ], "suggestions": [] } }
  ```

- **Success (200), out of scope:**

  ```json
  { "success": true, "data": { "answer": "I don't have verified information about this yet. I've logged your question so the CampusOS team can add an answer.", "level": "LOW", "confidence": 0.09, "intent": null, "answeredBy": "fallback", "sources": [], "suggestions": [ { "id": "…", "question": "What is the minimum class attendance requirement?", "link": "/helpdesk/…" } ] } }
  ```

  `answeredBy` is one of `intent`, `knowledge_base`, `llm` or `fallback`.
- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 400 | `VALIDATION_ERROR` | Empty, over 500 characters, or a bad session id |
  | 403 | `FORBIDDEN` | Bad Origin |
  | 404 | `NOT_FOUND` | Session not found or not yours |
  | 429 | `RATE_LIMITED` | Rate limit hit |

#### `GET /api/chatbot/sessions/{sessionId}`

The last 50 messages of a session, oldest first.

- **Auth:** the session's owner. Anonymous sessions are reachable only through their unguessable token, and a signed-in user's session is never visible to anyone else (they get 404).
- **Success (200):**

  ```json
  { "success": true, "data": { "sessionId": "…", "messages": [ { "id": "…", "role": "USER", "content": "Is the university bus free for students?", "confidence": null, "intent": null, "feedback": null, "createdAt": "…" } ] } }
  ```

- **Errors:** 400 (bad token), 404.

#### `POST /api/chatbot/messages/{messageId}/feedback`

Thumbs up or down on an assistant message.

- **Auth:** the session's owner. **Headers:** `Origin`.
- **Body:**

  ```json
  { "sessionId": "…", "helpful": false }
  ```

- **Success (200):**

  ```json
  { "success": true, "data": { "messageId": "…", "feedback": "NOT_HELPFUL" } }
  ```

- **Errors:** 400, 404 (not an assistant message in that session).

#### `GET /api/admin/chatbot/unanswered`

Knowledge gaps for admins to fill. Requires `chat:analytics` (ADMIN+).

- **Query:** `type=unanswered` (default; questions the bot refused) or `type=unhelpful` (thumbs-down answers, paired with their question), `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "question": "What is the capital of Mars?", "answer": null, "confidence": null, "createdAt": "…" } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

- **Errors:** 401, 403.

#### Admin: knowledge base (`kb:manage`, held by ADMIN and SUPER_ADMIN)

All mutations are audited and revalidate `kb`. Editing an entry's question or answer clears its `isSample` flag, because an admin has now verified it.

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/helpdesk/entries` | `category?`, `published?`, `q?`, `cursor?`, `limit?` | 200: all entries, including unpublished ones, `viewCount` and the sample flag |
| `POST /api/admin/helpdesk/entries` | `{ "category": "GENERAL", "question": "Where is the IT Help Desk?", "answer": "…", "keywords": ["it","help"], "isPublished": true }` | 201: the entry |
| `PATCH /api/admin/helpdesk/entries/{id}` | Any field. `{ "isPublished": false }` unpublishes and `true` publishes. | 200 |
| `DELETE /api/admin/helpdesk/entries/{id}` | none | 200: `{ "message": "Entry deleted.", "id": "…" }` |
| `POST /api/admin/helpdesk/import` | `{ "entries": [ {…create body…} ], "skipDuplicates": true }` (max 500 entries, 1 MB) | 201: `{ "created": 12, "skipped": ["Existing question?"] }`. With `skipDuplicates: false`, duplicates return 409 with `details.duplicates`. |

Errors: 400, 401, 403, 404, 409.

**Auto-sync.** Generated knowledge-base entries keep the chatbot current:
- Creating, updating or deleting a bus route or trip regenerates that route's entry (for example *"When does the Dhanmondi bus (route R1) run?"*).
- Creating, updating or deleting an `EXAM` notice creates, updates or removes its entry.

### Bus schedule

#### `GET /api/bus/routes`

All active routes with their stops (`[{ name, offsetMinutes }]` in to-campus order) and active trips.

- **Auth:** none. **Cached:** tag `buses`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "code": "R1", "name": "Dhanmondi", "stops": [ { "name": "Dhanmondi 27", "offsetMinutes": 0 }, { "name": "City University Campus (Khagan, Birulia)", "offsetMinutes": 75 } ], "notes": "…", "trips": [ { "id": "…", "departureTime": "07:00", "direction": "TO_CAMPUS", "daysOfWeek": [0,1,2,5,6], "isActive": true } ] } ] }
  ```

#### `GET /api/bus/routes/{code}`

One route plus `nextDepartures`, computed live in Asia/Dhaka time and aware of the campus calendar. On an off day (Wednesday, Thursday) or a special closure, `service` is `false`, `reason` is `OFF_DAY` or `CLOSURE`, `message` explains it and `nextServiceAt` is the first departure of the next service day.

- **Auth:** none. **Cached:** tags `buses` and `bus:{id}`.
- **Success (200):**

  ```json
  { "success": true, "data": { "code": "R1", "name": "Dhanmondi", "stops": [], "trips": [], "service": true, "reason": null, "message": "Buses are running today.", "nextServiceAt": null, "nextDepartures": [ { "tripId": "…", "direction": "TO_CAMPUS", "stop": "Dhanmondi 27", "time": "07:00", "at": "2026-10-08T01:00:00.000Z", "dayOffset": 0, "minutesUntil": 411 } ] } }
  ```

- **Errors:** 400, 404.

#### `GET /api/bus/next?route=R2&stop=gabtoli&direction=FROM_CAMPUS&limit=3`

Next departures at a stop.

- **Auth:** none. **Behaviour:** `stop` is matched case-insensitively. A `FROM_CAMPUS` trip reaches the stop at departure + (journey − stop offset). Wednesday, Thursday and special closures have no service: the response then has `service: false`, a `reason` (`OFF_DAY` or `CLOSURE`), a `message`, `nextServiceAt`, and `departures` starting at the next service day.
- **Success (200):**

  ```json
  { "success": true, "data": { "route": { "code": "R2", "name": "Mirpur" }, "stop": "Gabtoli", "now": "…", "service": true, "reason": null, "message": "Buses are running today.", "noMoreToday": false, "nextServiceAt": null, "departures": [ { "time": "14:05", "direction": "FROM_CAMPUS", "dayOffset": 0, "minutesUntil": 845, "at": "2026-10-08T08:05:00.000Z" } ] } }
  ```

- **Errors:** 400 (bad code, or an unknown stop; the message lists the valid stops), 404.

#### Admin: bus (`buses:manage`, held by ADMIN and SUPER_ADMIN)

Every mutation is audited, regenerates the route's KB entry, and revalidates `buses`, `kb`, `stats` and `bus:{id}`.

| Method & path | Body | Success |
| --- | --- | --- |
| `GET /api/admin/bus/routes` | none | 200: all routes, including inactive ones and all trips |
| `POST /api/admin/bus/routes` | `{ "code": "R7", "name": "Gazipur", "stops": [ { "name": "Gazipur Chowrasta", "offsetMinutes": 0 }, { "name": "Campus", "offsetMinutes": 90 } ], "notes": null, "isActive": true }`. The first offset must be 0 and offsets must strictly increase. | 201 |
| `PATCH /api/admin/bus/routes/{id}` | Any of `name`, `stops`, `notes`, `isActive` | 200 |
| `DELETE /api/admin/bus/routes/{id}` | none | 200 (soft delete; its KB entry is removed) |
| `POST /api/admin/bus/routes/{id}/trips` | `{ "departureTime": "19:00", "direction": "FROM_CAMPUS", "daysOfWeek": [5,6,0,1,2] }` (0 = Sunday; only Friday to Tuesday, i.e. 5, 6, 0, 1, 2, are allowed) | 201 |
| `PATCH /api/admin/bus/trips/{id}` | Any trip field | 200 |
| `DELETE /api/admin/bus/trips/{id}` | none | 200 |

Errors: 400 (bad `HH:mm`, days or stops), 403, 404, 409 (duplicate code), 422 `BUS_DAY_NOT_ALLOWED` (a trip on Wednesday or Thursday).

### Campus calendar

#### `GET /api/calendar`

The weekly rule, today's status and the upcoming special closures, all on the Asia/Dhaka calendar.

- **Auth:** none. **Cached:** tag `calendar` (expired when an admin changes a closure).
- **Success (200):**

  ```json
  { "success": true, "data": { "timeZone": "Asia/Dhaka", "now": "2026-10-14T04:00:00.000Z", "weeklyRule": { "weekStart": "Friday", "workingDays": ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"], "offDays": ["Wednesday", "Thursday"], "busServiceDays": ["Friday", "Saturday", "Sunday", "Monday", "Tuesday"] }, "today": { "dateKey": "2026-10-14", "weekday": "Wednesday", "campusOpen": false, "busService": false, "campusReason": "OFF_DAY", "busReason": "OFF_DAY" }, "closures": [ { "dateKey": "2026-12-16", "title": "Victory Day", "closesCampus": true, "suspendsBus": true, "note": null } ] } }
  ```

#### Admin: special closures (`calendar:manage`, held by ADMIN and SUPER_ADMIN)

Every mutation is audited (`calendar.closure_create`, `calendar.closure_update`, `calendar.closure_delete`) and expires the tags `calendar`, `buses` and `kb`.

| Method & path | Body | Success |
| --- | --- | --- |
| `GET /api/admin/calendar/closures?includePast=false&cursor=…&limit=…` | none | 200: cursor-paginated closures (`includePast` is `"true"` or `"false"`, default `false`) |
| `POST /api/admin/calendar/closures` | `{ "date": "2026-12-16", "title": "Victory Day", "closesCampus": true, "suspendsBus": true, "note": null }` (strict; at least one of `closesCampus` / `suspendsBus` must be true) | 201 |
| `PATCH /api/admin/calendar/closures/{id}` | Any of `date`, `title`, `closesCampus`, `suspendsBus`, `note` | 200 |
| `DELETE /api/admin/calendar/closures/{id}` | none | 200 |

Errors: 400 (invalid date, empty title, a closure that changes nothing), 401, 403, 404, 409 (a closure already exists for that date).

### Notices, forms & follows

#### `GET /api/notices`

Live notices (non-expired), pinned first, then newest.

- **Auth:** none. **Cached:** tag `notices`, with an hourly key for expiry.
- **Query:** `category?` (`CLASS_CANCELLATION|EXAM|GENERAL|URGENT|FORM_DEADLINE`), `departmentId?`, `courseId?`, `q?`, `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "title": "Midterm Exam Schedule - Fall 2026", "body": "…", "category": "EXAM", "pinned": true, "expiresAt": null, "attachmentUrl": null, "createdAt": "…", "department": null, "course": null } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### `GET /api/notices/{id}`

One notice.

- **Auth:** none. **Cached:** tags `notices` and `notice:{id}`.
- **Success (200):** the notice object. **Errors:** 400, 404.

#### Admin: notices (`notices:manage`, held by ADMIN and SUPER_ADMIN)

`attachmentUrl` must be a PDF or image from the upload pipeline. Mutations are audited, revalidate `notices`, `notice:{id}`, `kb` and `stats`, and re-sync EXAM notices into the knowledge base.

| Method & path | Body | Success |
| --- | --- | --- |
| `GET /api/admin/notices` | `cursor?`, `limit?` | 200: all notices, including expired ones |
| `POST /api/admin/notices` | `{ "title": "CSE-3101 lab moved to Lab 4", "body": "…", "category": "GENERAL", "departmentId": "…", "courseId": "…", "pinned": false, "expiresAt": "2026-11-01T00:00:00+06:00", "attachmentUrl": null }` | 201. After the response, an **in-app notification fan-out** reaches students of that department and followers of the department or course, in batches of 1,000. Global notices (no department or course) are not fanned out. |
| `PATCH /api/admin/notices/{id}` | Any create field | 200 |
| `DELETE /api/admin/notices/{id}` | none | 200 (soft delete) |

Errors: 400 (unknown department or course, a course from another department, or a foreign attachment), 403, 404.

#### `GET /api/forms`

Open forms (for example Google Forms) whose deadline hasn't passed, soonest deadline first; forms with no deadline come last.

- **Auth:** none. **Cached:** tag `forms`. **Query:** `clubId?`, `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "title": "Blood Donation Camp Volunteer Sign-up", "description": "…", "url": "https://…", "deadline": "2026-10-12T17:58:00.000Z", "club": { "id": "…", "name": "CU Blood Donors & Social Welfare Club", "slug": "cu-blood-donors-club" } } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### Admin: forms (`forms:manage`, held by CLUB_ADMIN for their own clubs, ADMIN and SUPER_ADMIN)

URLs must be https. A CLUB_ADMIN must set the `clubId` of one of their clubs; admins may post campus-wide forms. Mutations are audited and revalidate `forms`.

| Method & path | Body | Success |
| --- | --- | --- |
| `GET /api/admin/forms` | `cursor?`, `limit?` | 200 (scoped to the CLUB_ADMIN's clubs) |
| `POST /api/admin/forms` | `{ "title": "Computer Club Volunteer Form", "url": "https://forms.gle/…", "clubId": "…", "deadline": "2026-12-01T23:59:00+06:00", "description": null, "isOpen": true }` | 201 |
| `PATCH /api/admin/forms/{id}` | Any field | 200 |
| `DELETE /api/admin/forms/{id}` | none | 200 (soft delete) |

Errors: 400 (non-https URL, or a CLUB_ADMIN without a club), 403 (another club), 404.

#### `POST /api/follow` · `DELETE /api/follow?targetType=COURSE&targetId=…` · `GET /api/me/follows`

Follow or unfollow a department, course or club. Following drives notice notifications.

- **Auth:** cookie. **Headers:** `Origin`.
- **POST body:**

  ```json
  { "targetType": "COURSE", "targetId": "cmuy…" }
  ```

- **Success (200):**

  ```json
  { "success": true, "data": { "following": true, "targetType": "COURSE", "targetId": "…" } }
  ```

  `GET /api/me/follows` returns `[ { "targetType": "COURSE", "targetId": "…", "name": "CSE-3101 Database Management Systems", "createdAt": "…" } ]`.
- **Errors:** 400, 401, 404 (the target doesn't exist).

### Module 4: Lost & found + complaints

#### `GET /api/lost-found`

The public board. Cards contain **no reporter identity or contact details**.

- **Auth:** none. **Cached:** tag `lost-found`.
- **Query:** `type?` (`LOST|FOUND`), `category?`, `status` (default `OPEN`; `OPEN|CLAIMED|RESOLVED` — hidden posts are never listed), `q?`, `dateFrom?`, `dateTo?`, `cursor?`, `limit?`.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "type": "FOUND", "title": "Black wallet found near library", "description": "…", "category": "WALLET", "locationText": "Library staircase", "occurredAt": "…", "imageUrls": [], "status": "OPEN", "createdAt": "…" } ], "meta": { "limit": 20, "nextCursor": null } }
  ```

#### `POST /api/lost-found`

Posts a lost or found item.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `upload`.
- **Body:** `imageUrls` (at most 4) must be the caller's own uploads from `/api/upload/image` with `purpose=lost-found`. `contactVisible` (default `false`) lets an **approved claimer** see your email and phone; contact details are never public.

  ```json
  { "type": "LOST", "title": "Grey backpack", "description": "Grey backpack with a laptop charger inside.", "category": "BAG", "locationText": "Bus R1", "occurredAt": "2026-10-07T09:00:00+06:00", "imageUrls": [], "contactVisible": true }
  ```

- **Success (201):** the post, including `contactVisible`, `resolvedAt` and `_count.claims`.
- **Errors:** 400 (a foreign or external photo URL, more than 4 photos, or a future date), 401, 403, 429.

#### `GET /api/lost-found/{id}`

The public post plus a per-viewer `viewer` block.

- **Auth:** none required. **Cached:** the post itself, under tags `lost-found` and `lf:{id}`. The `viewer` block is computed live.
- **`viewer.contact`** contains the other party's name, email and phone, and is shown **only** to:
  - the reporter, once a claim is approved (the claimer's contact);
  - the approved claimer, when the reporter set `contactVisible: true` (the reporter's contact).

  Anonymous viewers and other users always get `null`.
- **Success (200):**

  ```json
  { "success": true, "data": { "id": "…", "title": "…", "status": "CLAIMED", "reporter": { "name": "Demo Student Two" }, "_count": { "claims": 1 }, "viewer": { "isReporter": false, "myClaim": { "id": "…", "status": "APPROVED" }, "contact": { "name": "Demo Student Two", "email": "…", "phone": null } } } }
  ```

- **Errors:** 400, 404 (unknown, removed or hidden).

#### `PATCH /api/lost-found/{id}` · `DELETE /api/lost-found/{id}`

Edits or soft-deletes your own post. Edits are allowed only while the post is `OPEN`.

- **Auth:** cookie (reporter).
- **PATCH body:** any of `title`, `description`, `category`, `locationText`, `occurredAt`, `imageUrls`, `contactVisible`.

  ```json
  { "contactVisible": true }
  ```

- **Success (200):** the updated post. DELETE returns `{ "message": "Post deleted.", "id": "…" }`.
- **Errors:** 400, 401, 403 (not yours), 404, 409 (not `OPEN`).

#### `POST /api/lost-found/{id}/claim`

Claims an item. The reporter is notified in-app and by email.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`.
- **Body:**

  ```json
  { "message": "Black leather wallet, has my NID (Rahim) and a CU library card inside." }
  ```

- **Success (201):**

  ```json
  { "success": true, "data": { "message": "Claim sent. The reporter has been notified.", "claim": { "id": "…", "status": "PENDING", "createdAt": "…" } } }
  ```

- **Errors:**

  | Status | Code | When |
  | --- | --- | --- |
  | 409 | `OWN_ITEM` | You reported this item |
  | 409 | `ITEM_NOT_OPEN` | The item is no longer open |
  | 409 | `ALREADY_CLAIMED` | You already have a pending or approved claim. A claim that was rejected can be filed again. |
  | 400 / 401 / 404 | | Bad input, not signed in, unknown item |

#### `GET /api/lost-found/{id}/claims` · `PATCH /api/lost-found/{id}/claims/{claimId}`

Lists and decides claims.

- **Auth:** the reporter or a `lostfound:moderate` user.
- **GET success (200):**

  ```json
  [ { "id": "…", "message": "…", "status": "PENDING", "createdAt": "…", "claimer": { "id": "…", "name": "Demo Student", "studentId": "CU-DEMO-001" } } ]
  ```

  No contact details are included.
- **PATCH body:**

  ```json
  { "decision": "APPROVE" }
  ```

  or `{ "decision": "REJECT" }`.
- **PATCH success (200):** `{ "claimId": "…", "decision": "APPROVE", "itemStatus": "CLAIMED" }`. Approving marks the item `CLAIMED` and auto-rejects other pending claims. Every affected claimer is notified in-app and by email.
- **Errors:** 403 (strangers), 404, 409 (claim not `PENDING`, or the item already claimed).

#### `PATCH /api/lost-found/{id}/status`

Moves the item through its lifecycle.

- **Auth:** the reporter or a moderator.
- **Body:** `{ "status": "RESOLVED" }`.
- **Allowed transitions:**
  - Reporter: `OPEN → RESOLVED`, `CLAIMED → RESOLVED`, and `CLAIMED → OPEN` (a claim fell through; the approved claim is rejected).
  - Moderators may make any transition.
- **Success (200):** `{ "id": "…", "status": "RESOLVED" }`.
- **Errors:** 403; 409 (an illegal transition, for example `"Cannot change status from RESOLVED to OPEN."`).

#### `GET /api/lost-found/{id}/matches`

Up to 5 likely counterpart posts.

- **Auth:** none. **Cached:** tags `lost-found` and `lf:{id}`.
- **Matching:** posts of the opposite type, still `OPEN`, within ±60 days. The score is 0.35·same category + 0.45·`pg_trgm` text similarity + 0.2·date proximity.
- **Success (200):**

  ```json
  { "success": true, "data": [ { "id": "…", "type": "FOUND", "title": "Black wallet found near library", "score": 0.6766, "…": "card fields" } ] }
  ```

#### `GET /api/me/lost-found`

Your own posts, in any status, with claim counts.

- **Auth:** cookie. **Query:** `status?`, `cursor?`, `limit?`.

#### Admin: lost & found moderation (`lostfound:moderate`, held by MODERATOR, ADMIN and SUPER_ADMIN)

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/lost-found` | `status?`, `type?`, `q?`, `cursor?`, `limit?` | 200: every post, including hidden ones, with the reporter's identity |
| `PATCH /api/admin/lost-found/{id}` | `{ "action": "HIDE", "reason": "Contains a personal phone number." }`. `action` is `HIDE`, `RESTORE`, `RESOLVE` or `REMOVE`; HIDE and REMOVE need a `reason`. | 200: `{ "id": "…", "action": "HIDE" }`. The action is audited and, for HIDE and REMOVE, the reporter is notified. |

Errors: 400 (no reason), 403, 404.

#### `POST /api/complaints`

Files a complaint.

- **Auth:** cookie. **Headers:** `Origin`, `Content-Type: application/json`. **Rate limit:** `upload`.
- **Body:** `category` is `ACADEMIC|ADMINISTRATIVE|FACILITIES|TRANSPORT|IT_SERVICES|FINANCE|HARASSMENT|OTHER`. `attachmentUrls` (at most 4) must be your own image uploads. With `isAnonymous: true`, staff never see who filed it.

  ```json
  { "category": "TRANSPORT", "subject": "Bus R1 left 15 minutes early", "description": "The 08:30 R1 bus left Dhanmondi 27 at 08:15 today…", "attachmentUrls": [], "isAnonymous": false }
  ```

- **What happens:** a ticket `CU-<Dhaka year>-<6-digit sequence>` is allocated by an atomic per-year counter. Harassment complaints are auto-prioritized `HIGH`. A confirmation goes out in-app and by email.
- **Success (201):**

  ```json
  { "success": true, "data": { "message": "Complaint received. Your ticket number is CU-2026-000002.", "complaint": { "id": "…", "ticketNo": "CU-2026-000002", "category": "TRANSPORT", "subject": "…", "status": "RECEIVED", "priority": "MEDIUM", "isAnonymous": false, "createdAt": "…" } } }
  ```

- **Errors:** 400, 401, 403, 429.

#### `GET /api/me/complaints`

Your complaints, newest first.

- **Auth:** cookie. **Query:** `status?`, `cursor?`, `limit?`. **Response header:** `Cache-Control: private, no-store`. Complaints are never cached publicly.

#### `GET /api/complaints/track/{ticketNo}`

Tracks a ticket.

- **Auth:** optional. **Rate limit:** 10 per 15 min per IP, against enumeration.
- **Views:**
  - **Signed-in owner:** full details plus the public timeline (internal notes are excluded).
  - **`?email=<complainant email>`:** a limited view with `ticketNo`, `category`, `status`, the dates and a timeline of statuses only. No subject, description or notes.
  - **Anything else** (wrong email, someone else's ticket, unknown ticket): the same `404 NOT_FOUND`, so tickets can't be enumerated.
- **Success (200), owner:**

  ```json
  { "success": true, "data": { "view": "owner", "ticketNo": "CU-2026-000002", "status": "RESOLVED", "subject": "…", "timeline": [ { "status": "RECEIVED", "note": "Complaint received.", "createdAt": "…" }, { "status": "RESOLVED", "note": "The driver has been warned…", "createdAt": "…" } ] } }
  ```

- **Errors:** 400 (malformed ticket), 404, 429.

#### Admin: complaints (`complaints:manage`, held by MODERATOR, ADMIN and SUPER_ADMIN)

For anonymous complaints, `user` is `null` everywhere, including the complainant's own timeline entries.

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/admin/complaints` | `status?`, `priority?`, `category?`, `assignee?` (`me`, `unassigned` or a user id), `q?` (ticket or subject), `cursor?`, `limit?` | 200: list with `user` (or `null`) and `assignedTo` |
| `GET /api/admin/complaints/{id}` | none | 200: full detail including **internal** notes and their authors |
| `PATCH /api/admin/complaints/{id}` | `{ "status": "IN_REVIEW", "priority": "HIGH", "assignedToId": "<staff id>", "note": "Forwarded to the Transport Office.", "isInternal": false }` (any subset) | 200: the updated detail. Each change adds a `ComplaintUpdate`; RESOLVED sets `resolvedAt`. Status changes and **public** notes notify the complainant in-app and by email; internal notes never do. |

Errors: 400 (the assignee must be active complaints staff, or nothing to update), 403, 404.

### Platform

#### `GET /api/search?q=dbms&limit=5`

Grouped search across events (upcoming), resources (ranked search), notices (live), helpdesk (KB retrieval) and lost & found (open or claimed).

- **Auth:** none. **Rate limit:** `search`. **Cached:** per normalized query, under tags `events`, `resources`, `notices`, `kb` and `lost-found`. Terms are logged to `SearchTerm` after the response, for the top-searched-terms chart.
- **Query:** `limit` is 1–10 per group (default 5).
- **Success (200):**

  ```json
  { "success": true, "data": { "q": "dbms", "results": { "events": [], "resources": [ { "id": "…", "title": "Database Management Systems - Complete Lecture Notes", "subtitle": "CSE-3101 · CSE", "link": "/resources/…" } ], "notices": [], "helpdesk": [], "lostFound": [] } } }
  ```

- **Errors:** 400 (`q` under 2 characters), 429.

#### Notifications (cookie auth, `Cache-Control: private, no-store`)

| Method & path | Body / query | Success |
| --- | --- | --- |
| `GET /api/notifications` | `unreadOnly?` (`true`), `cursor?`, `limit?` | 200: `[ { "id": "…", "type": "COMPLAINT", "title": "Update on CU-2026-000002", "body": "…", "link": "/complaints/CU-2026-000002", "readAt": null, "createdAt": "…" } ]` |
| `GET /api/notifications/unread-count` | none | 200: `{ "unread": 7 }` |
| `PATCH /api/notifications/{id}/read` | none (needs `Origin`) | 200: `{ "id": "…", "read": true }`. 404 if it isn't yours. |
| `POST /api/notifications/read-all` | none (needs `Origin`) | 200: `{ "marked": 6 }` |

#### `GET /api/cron/reminders`

The "event starts tomorrow" job, built for Vercel Cron.

- **Auth:** `Authorization: Bearer <CRON_SECRET>`; otherwise 401.
- **Behaviour:** registrants of published events that start tomorrow (Asia/Dhaka) get an in-app notification and a bulk email. Each event is claimed with `reminderSentAt` first, so repeated runs never double-send. The same job is available as `npm run reminders:send`.
- **Success (200):**

  ```json
  { "success": true, "data": { "events": 1, "notified": 0, "emailed": 0 } }
  ```

  A second run returns `{ "events": 0, … }`.

#### `GET /api/admin/stats`

The admin dashboard.

- **Permission:** `admin:access` (any staff role). **Cached:** tag `stats`, with an hourly key.
- **Success (200):** `totals` plus chart series. Signups are per Dhaka day over 30 days and registrations per week over 12 weeks; `complaintResolution` is in hours, and the top 5 events and top 10 search terms are included.

  ```json
  { "success": true, "data": { "generatedAt": "…", "totals": { "users": 6, "events": 30, "registrations": 6, "checkIns": 1, "resources": 55, "pendingResources": 4, "lostFound": 6, "openLostFound": 5, "complaints": 2, "openComplaints": 1, "chatbotUnanswered": 10, "chatbotUnhelpful": 1 }, "charts": { "signupsPerDay": [ { "day": "2026-10-07", "count": 6 } ], "registrationsPerWeek": [], "complaintResolution": { "resolved": 1, "avgHours": 0, "medianHours": 0 }, "topEvents": [], "topSearchTerms": [ { "term": "bus", "count": 2 } ] } } }
  ```

- **Errors:** 401, 403.

#### Admin: users & audit

| Method & path | Permission | Body / query | Success / rules |
| --- | --- | --- | --- |
| `GET /api/admin/users` | `users:manage` (ADMIN+) | `q?` (name, email or student ID), `role?`, `isActive?`, `cursor?`, `limit?` | 200: users (no secrets) |
| `PATCH /api/admin/users/{id}` | `users:manage` | `{ "role": "MODERATOR" }` and/or `{ "isActive": false }` | 200: the user. Every change **revokes that user's sessions** (tokenVersion++). You can't change your own account here, and only a SUPER_ADMIN may grant or touch ADMIN/SUPER_ADMIN (otherwise 403). |
| `POST /api/admin/users/{id}/force-logout` | `users:manage` | none (needs `Origin`) | 200: `{ "message": "User signed out on all devices.", "id": "…" }` (same rules) |
| `GET /api/admin/audit-logs` | `audit:view` (ADMIN+) | `action?` (e.g. `complaint.update`), `entityType?`, `entityId?`, `actorId?`, `cursor?`, `limit?` | 200: `[ { "id": "…", "action": "user.update", "entityType": "User", "entityId": "…", "metadata": {}, "ip": "…", "createdAt": "…", "actor": { "id": "…", "name": "…", "role": "ADMIN" } } ]` |

#### `POST /api/revalidate`

Manual cache revalidation for operations; server to server, so there is no Origin check.

- **Auth:** header `x-revalidate-secret: <REVALIDATE_SECRET>`; otherwise 401. **Rate limit:** `authStrict`.
- **Body:**

  ```json
  { "tags": ["events", "kb", "event:cmuy…", "everything"] }
  ```

  Only the static tags in the tag map and `<kind>:<cuid>` tags are allowed. Anything else is reported back as `rejected`.
- **Success (200):**

  ```json
  { "success": true, "data": { "revalidated": ["events", "kb", "event:cmuy…"], "rejected": ["everything"] } }
  ```

- **Errors:** 400 (no allowlisted tags), 401, 429.

#### `GET /api/health`

Uptime probe, sent with `Cache-Control: no-store`.

- **Success (200):**

  ```json
  { "success": true, "data": { "status": "ok", "version": "0.1.0", "db": { "ok": true, "latencyMs": 277 }, "uptimeSeconds": 28, "time": "…" } }
  ```

- **Errors:** 503 `DEGRADED` when the database is unreachable.

#### `GET /sitemap.xml`

Generated by `src/app/sitemap.ts`. It lists the static public pages plus every published event, approved resource, live notice, published FAQ entry and active club, tag-cached under `events`, `resources`, `notices`, `kb` and `clubs`.

### Admin portal additions

All `/api/admin/*` routes are double-guarded: `proxy.ts` rejects non-staff (401/403) and each handler calls `requirePermission()` for its own permission. Mutations also need a same-origin `Origin` header and are rate limited (`admin-write`, 60 per minute per IP).

**Role changes in this task:** `MODERATOR` gained `chat:analytics` (it needs the unanswered-question inbox) and lost `events:checkin` (moderators only work in moderation queues). `ADMIN` and `SUPER_ADMIN` gained `settings:manage`.

#### `GET /api/settings/public`

Banner and maintenance flag. The public layout and the proxy read it.

- **Auth:** none. **Cached:** tag `settings` (expired by the settings mutation).
- **Success (200):**

  ```json
  { "success": true, "data": { "bannerMessage": "Mid-term exams start Sunday.", "bannerTone": "warning", "maintenanceMode": false, "maintenanceMessage": null } }
  ```

#### `GET /api/admin/settings` and `PATCH /api/admin/settings`

- **Auth:** permission `settings:manage` (ADMIN, SUPER_ADMIN).
- **PATCH body** (strict, at least one field): `bannerMessage` (string ≤ 300 or `null`), `bannerTone` (`info` | `warning` | `urgent`), `maintenanceMode` (boolean), `maintenanceMessage` (string ≤ 300 or `null`).
- **Success (200):** the full settings document (same shape as above).
- **Errors:** 400, 401, 403, 429.
- **Side effects:** audit entry `settings.update`; tag `settings` expired. While `maintenanceMode` is on, visitors who are not staff see a full-screen "We will be right back" cover on every page except `/admin/*` (the root layout reads the tag-cached flag, so the cover appears as soon as the `settings` tag expires). The proxy refuses API **writes** from non-staff with HTTP 503 (`{"error":{"code":"MAINTENANCE"}}`); API reads stay available. Exempt API paths: `/api/admin/*`, `/api/auth/*`, `/api/health`, `/api/settings/*`, `/api/cron/*`, `/api/revalidate`. Each server instance caches the flag used for API writes for 10 s.

#### `GET /api/admin/clubs/{id}/members` · `POST` · `PATCH /{userId}` · `DELETE /{userId}`

Club membership and club admins.

- **Auth:** permission `events:manage`. A CLUB_ADMIN may manage only their own clubs. **Granting, changing or removing the `ADMIN` club role needs `clubs:manage`** (ADMIN, SUPER_ADMIN).
- **POST body:** `{ "email": "student@example.com", "role": "MEMBER" }` (`role`: `MEMBER` | `EXECUTIVE` | `ADMIN`, default `MEMBER`). **PATCH body:** `{ "role": "EXECUTIVE" }`.
- **Success:** 201 (POST) or 200 with `{ id, role, joinedAt, user: { id, name, email, role } }`; DELETE returns `{ "removed": true }`; GET is cursor-paginated.
- **Errors:** 403 (not your club, or granting ADMIN without permission), 404 (no active account with that email), 409 (already has that role).
- **Side effects:** `Club.memberCount` is recomputed in the same transaction. Assigning the first club-admin membership promotes a `USER` to `CLUB_ADMIN`; removing the last one demotes them back (their sessions are revoked so the new role applies). Tags `clubs`, `club:{id}`, `events`, `forms`.

#### `PATCH /api/admin/resources/bulk`

- **Auth:** permission `resources:moderate`. **Body:** `{ "ids": ["…"], "decision": "APPROVE" | "REJECT", "reason": "…" }` (1–50 ids; `reason` required for `REJECT`).
- **Success (200):** `{ "succeeded": ["id"], "failed": [ { "id": "…", "message": "Only pending resources can be reviewed." } ] }`. Each item is reviewed independently (own audit entry, notification and email).

#### `GET /api/admin/chatbot/analytics`

- **Auth:** permission `chat:analytics` (ADMIN, SUPER_ADMIN, MODERATOR).
- **Success (200):**

  ```json
  { "success": true, "data": { "totals": { "questions": 120, "answered": 104, "unanswered": 16, "helpful": 40, "notHelpful": 6 }, "confidence": [ { "bucket": "0-20%", "count": 3 } ], "topIntents": [ { "intent": "NEXT_BUS", "count": 31 } ] } }
  ```

#### `POST /api/admin/chatbot/unanswered/{id}/resolve`

Removes a handled question from the unanswered inbox (sets `isAnswered`). **Auth:** `chat:analytics`. **Body:** none (send `{}`). **Success:** `{ "resolved": true }`. **Errors:** 404.

#### `GET /api/cron/maintenance`

Daily housekeeping: deletes expired rate-limit windows (older than 1 h) and OTP rows expired more than 24 h ago. **Auth:** `Authorization: Bearer $CRON_SECRET`. **Success:** `{ "rateLimits": 120, "otps": 14 }`. Scheduled in `vercel.json` at 21:30 UTC.

#### Changed responses

- `POST /api/admin/notices` now also returns `recipients`: how many students are being notified (department students plus followers of the department or course; `0` for campus-wide notices, which are not pushed). The admin toast shows it.
- `GET /api/admin/stats` adds `charts.complaintsByStatus` and is **trimmed by role**: moderators receive only moderation numbers, club admins only event numbers, admins everything.

## Caching tag map

How it works:
- **Reads:** public data uses `"use cache"` + `cacheLife("max")` + `cacheTag(...)`. The fetchers live in `src/server/queries/*`.
- **Writes:** every mutation calls a helper in `src/lib/cache-tags.ts`. The helpers call `revalidateTag(tag, { expire: 0 })`, which expires the entry immediately, so the next request re-renders from the database and nobody sees a cancelled event or a deleted resource. We tested `"max"` (stale-while-revalidate) first and it served one stale response after each mutation. Mutations are rare and hot counters only touch per-item detail tags, so the extra render is cheap.
- **Time:** there is no time-based revalidation. Fetchers that depend on "now" (upcoming, this-week and past events, a club's next events) take an hour bucket as an argument, so the cache **key** changes at most hourly.
- **Measured** (local `next start` → Neon us-east-2): `GET /api/events` took 577 ms on a cache miss and about 4 ms on a hit.

| Tag | Covers | Invalidated by |
| --- | --- | --- |
| `events` | Event lists, event pages, club pages' upcoming events | `revalidateEvents()`, `revalidateClubs()` (event create/update/publish/cancel/delete, club changes) |
| `event:{id}` | One event's page (seat count) | `revalidateEvents(id)`, `revalidateEventDetail(id)` (register, cancel registration, check-in) |
| `calendar` | `GET /api/events/calendar`, `GET /api/calendar` (weekly rule and special closures) | `revalidateEvents()`, `revalidateClubs()`, `revalidateCampusClosures()` (closure create/update/delete) |
| `clubs` | Club directory and club pages | `revalidateClubs()` |
| `club:{id}` | One club page | `revalidateClubs(id)` |
| `forms` | Forms & deadlines listing | `revalidateForms()`, `revalidateClubs()` |
| `resources` | Resource lists, search and detail | `revalidateResources()` (approve, staff upload, update, delete), `revalidateAcademics()` |
| `resource:{id}` | One resource page (download and bookmark counts) | `revalidateResources(id)`, `revalidateResourceDetail(id)` (download, bookmark) |
| `departments` / `courses` | `GET /api/departments`, `GET /api/courses` | `revalidateAcademics()` |
| `department:{id}` / `course:{id}` | Course lists per department, resource pages in that course or department | `revalidateAcademics(refs)`, `revalidateResources(id, refs)` |
| `notices` | `GET /api/notices`, the chatbot's class-cancellation intent, global search, sitemap | `revalidateNotices()` (notice create/update/delete), `revalidateAcademics()` |
| `notice:{id}` | `GET /api/notices/{id}` | `revalidateNotices(id)` |
| `forms` | `GET /api/forms`, the chatbot's open-forms intent | `revalidateForms()` (form create/update/delete), `revalidateClubs()` |
| `buses` | `GET /api/bus/routes`, `GET /api/bus/routes/{code}`, `/api/bus/next`, chatbot bus intents | `revalidateBuses()` (route or trip create/update/delete), `revalidateCampusClosures()` |
| `bus:{id}` | One route | `revalidateBuses(id)` |
| `kb` | Helpdesk lists, categories and entries, **cached chatbot retrieval**, global search, sitemap | `revalidateKnowledgeBase()` (entry CRUD, publish, import), `revalidateBuses()`, `revalidateCampusClosures()` and notice mutations (auto-synced entries) |
| `kb:{id}` | `GET /api/helpdesk/entries/{id}` | `revalidateKnowledgeBase(id)` |
| `lost-found` | `GET /api/lost-found`, item pages, matches, global search | `revalidateLostFound()` (post create/edit/delete, claim decisions, status changes, moderation) |
| `lf:{id}` | One post and its matches | `revalidateLostFound(id)` |
| `settings` | Site banner (every public layout), maintenance page, `GET /api/settings/public` | `revalidateSettings()` (admin settings) |
| `stats` | `GET /api/admin/stats` (hourly key) | Every collection helper, plus complaint and user changes |

**Never cached** (user-specific or private): notifications, my registrations, bookmarks, follows and posts, chatbot sessions, complaints (filing, tracking, admin), the per-viewer `viewer` block of a lost & found post, and admin lists.

## Security

- Zod-validated environment that fails fast. Secrets come only from `process.env`, and `.env*` is git-ignored except `.env.example`.
- bcrypt (cost 12) password hashes. Email OTPs are stored hashed, with an expiry and an attempt limit.
- JWT in an `httpOnly` cookie with `Secure` and `SameSite=Lax`. Token versioning allows revocation.
- `.strict()` Zod validation on every endpoint, an Origin check on mutations, DB-backed rate limiting, and a honeypot plus optional Turnstile on public forms.
- CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` are set in `next.config.ts`.
- Uploads are checked by magic bytes and size, and images are re-encoded (stripping EXIF and polyglots). PDFs are re-checked for `%PDF-` after upload.
- **Upload provenance:** stored file URLs must be UploadThing URLs whose key is tracked in `UploadedFile` and owned by the caller, so forged or borrowed URLs are rejected.
- **Club scoping:** a CLUB_ADMIN can manage and check in only at their own clubs. Check-in authorizes the door's event *before* looking up the ticket.
- **Concurrency safety:** seats are claimed with one atomic conditional `UPDATE`, check-ins with a conditional status flip, and counters are moved only by real row changes.
- CSV exports neutralize formula injection.
- Generic error messages, a structured logger that redacts secrets, and an audit log for admin actions.
- Full OWASP review, secret scan and IDOR tests: see [Production hardening](#production-hardening).

## Deployment

See **[Deployment checklist](#deployment-checklist-vercel--neon)** under Production hardening.

## Folder structure

```
prisma/
  schema.prisma                 # full data model
  migrations/                   # 8 migrations: init, full-text search, trigram indexes, course name, campus calendar…
  seed.ts / seed-content.ts     # accounts + reference data / demo events, courses, resources
prisma.config.ts                # Prisma 7 CLI config (DIRECT_URL, migrations, seed)
scripts/cleanup-orphan-uploads.ts, scripts/send-reminders.ts, scripts/explain-queries.ts
scripts/verify-db-doc.ts        # checks databasedesign.md against schema.prisma
scripts/verify-readme.ts        # checks this README against the routes, .env.example and package.json
vercel.json                     # daily reminder cron
docs/ARCHITECTURE.md, docs/TESTING.md, docs/QA_REPORT.md, docs/REQUIREMENTS_AUDIT.md, docs/SUBMISSION_CHECKLIST.md
databasedesign.md, pending.md, demovideoscript.md, SECURITY.md, CONTRIBUTING.md, CHANGELOG.md
playwright.config.ts            # e2e on port 3100 with the test-only mail hook
src/
  app/
    (public)/                   # cached public pages
    (auth)/                     # login, signup, OTP, reset
    (user)/                     # signed-in student area
    admin/login                 # staff sign-in (outside the console shell)
    admin/(console)/            # admin console (client-guarded, role-aware shell)
    api/                        # Route Handlers (JSON API)
  components/ui/                # design-system primitives (Button, Dialog, DataTable, ListView…)
  components/layout/            # site header/footer, user shell, page header, transitions
  components/shared/            # logo, theme toggle, Ctrl+K palette, chatbot, JSON-LD
  components/features/          # domain widgets: auth, events, clubs, resources, bus, notices, lost-found, complaints, dashboard
  components/admin/             # admin shell + QR check-in scanner
  components/providers/         # AppProviders, AuthProvider
  config/public-env.ts          # browser-safe NEXT_PUBLIC_* config
  config/chatbot-synonyms.ts    # English/Banglish/Bangla vocabulary → canonical search terms
  generated/prisma/             # Prisma client (generated, git-ignored)
  hooks/                        # useCursorList, useUrlFilters, useCountdown, useDebounce…
  lib/                          # env, prisma, logger, errors, api-response, cache-tags
  lib/auth/                     # session JWT, RBAC, password policy, OTP primitives (pure)
  proxy.ts                      # Next 16 proxy (ex-middleware): JWT-only route protection
  server/
    services/                   # auth, user, otp, email, audit, upload, club, event, registration, resource, academic,
                                #   notification, chatbot (+intents, llm), knowledge (+sync), bus, notice/forms, follow,
                                #   lost-found, complaint, platform (search log, reminders, users, audit, revalidate)
    queries/                    # tag-cached reads ("use cache"): events, clubs, resources, helpdesk, bus/notices/forms,
                                #   lost & found, global search, admin stats, sitemap
    domain/                     # pure rules: registration, check-in, bus timetable, tickets, lost & found
    chatbot/                    # pure chatbot pipeline: normalize, intents, retrieval SQL, confidence, compose
    search/                     # parameterised resource search query builder
    upload/                     # image pipeline (magic bytes → resize → compress)
    repositories/               # Prisma queries with safe selects
    validators/                 # strict Zod schemas
    middleware/                 # requireAuth/Role, rate limits, request & bot guards, cookies
    security/                   # rate-limiter core, client IP, form-timing token
    email/                      # branded email layout + templates
  app/api/uploadthing/          # UploadThing FileRouter (pdfUploader)
  types/                        # shared types (API envelope)
tests/unit/                     # vitest unit tests
tests/e2e/                      # Playwright specs + fixtures
```

## Frontend Architecture

**Rendering model.** Next.js 16 with Cache Components. The landing page is fully prerendered and served from the CDN with its data inline: it reads one tag-cached entry (`getHomeFeed` in `src/server/queries/home.queries.ts`) and never calls `connection()`. The parts that depend on the current time (this week's events, the "upcoming" count, "2 hours ago", the next bus and the highlighted day in the campus-week strip) are finished in the browser from the Dhaka clock, so a visit never starts a server function. `proxy.ts` only runs for `/api`, `/admin` and the signed-in student area, not for public pages. Public read data comes from `"use cache"` fetchers tagged via `src/lib/cache-tags.ts`. There is no time-based `revalidate`. Every mutation calls the matching `revalidateTag` helper. `getPublicStats()` (in `src/server/queries/platform.queries.ts`) is a server-side cached fetcher, not an HTTP endpoint, so it has no API reference entry.

**Route groups.**

| Group | Purpose | Chrome |
|---|---|---|
| `(public)` | Landing, events, clubs, resources, bus, notices, forms, helpdesk, lost & found, search | Glass navbar, mobile drawer, footer |
| `(auth)` | `/login`, `/signup`, `/verify-email`, `/forgot-password`, `/reset-password` | Split-screen brand panel |
| `(user)` | `/dashboard/*` | Sidebar (lg+), bottom tab bar (mobile), notification bell, profile menu |
| `admin/login` | Staff-only sign-in, visually distinct dark page | None |
| `admin/(console)` | Admin console | Collapsible role-aware sidebar, topbar, mobile drawer |

Each group has its own `template.tsx` (Framer Motion page transition) and `loading.tsx` skeleton. Global files: `not-found.tsx`, `error.tsx`, `global-error.tsx`, `manifest.ts`, `robots.ts`, `opengraph-image.tsx`, icons.

**Data layer.** `src/lib/api-client.ts` is a typed fetch client for the response envelope (`api.get/page/post/patch/delete`). It throws `ApiClientError` with `code`, `status` and `retryAfterSeconds`, turns network failures into `NETWORK_ERROR`, and emits a 401 event that `AuthProvider` handles. TanStack Query holds client state, with central keys in `src/lib/query-client.ts`. `AuthProvider` / `useAuth()` / `useRequireUser()` expose the session. Guards run in `proxy.ts` (cookie check, `?next=` redirect) and again client-side in the user and admin shells. `safeNext()` rejects open redirects.

**Design system ("Campus-Tech").** Tailwind v4 tokens are declared in `src/app/globals.css` (`@theme inline`). The palette is deep indigo with an emerald accent. Surfaces use glassmorphism, mesh and grain backgrounds. Fonts are loaded through `next/font`: Plus Jakarta Sans (body), Bricolage Grotesque (display) and Hind Siliguri (Bangla). Type scale uses `clamp()` so layouts hold from 360 px to 3840 px with no horizontal scroll. Light, dark and system themes come from `next-themes` and are persisted without a flash. Contrast follows WCAG AA, with visible focus rings, a skip link and `prefers-reduced-motion` respected (`MotionConfig reducedMotion="user"`). Framer Motion runs through `LazyMotion` (`domAnimation`, strict `m.*` components).

**Component library.**

- `src/components/ui`: Button, Input, Textarea, Select, Combobox, Checkbox/Switch (`choice`), OtpInput, PasswordInput (strength meter), Field, Card, Badge, Avatar, Tabs (`layoutId` indicator), Dialog/Sheet, DropdownMenu, Tooltip, Accordion, Progress, Skeleton (shimmer), Spinner, EmptyState/ErrorState, InfiniteList, DataTable, ImageDropzone/PdfDropzone, ImageWithFallback, SearchBar, StatCard/CountUp, Timeline, QRCode, ConfirmDialog, Breadcrumbs.
- `src/components/shared`: Logo, ThemeToggle, Ctrl+K command palette, chatbot launcher and panel, `JsonLd`.
- `src/components/layout`: SiteHeader, SiteFooter, UserShell, NotificationBell, UserMenu, PageTransition.
- `src/components/features/*`: domain widgets (auth forms, event card, bus countdown, landing sections).
- `src/components/admin`: AdminShell and the QR check-in scanner.

Every mutation shows a toast (`toastPromise` wraps `toast.promise`). Uploads: images go to `/api/upload/image` (server-side compression), PDFs go through the UploadThing client, with progress shown in both.

**Bot protection on forms.** Sign-up and forgot-password fetch a signed `formToken` from `/api/security/form-token`. The client waits out the minimum age before submitting. A hidden `website` honeypot field is included. See `useFormToken` and `Honeypot` in `auth-form-kit.tsx`.

**SEO.** `src/config/seo.ts` builds per-page metadata: canonical URL, `hreflang`-ready alternates, Open Graph and Twitter cards. It also provides JSON-LD builders: Organization, WebSite with SearchAction, EducationalOrganization, Event, BreadcrumbList and FAQPage. `src/config/seo-keywords.ts` holds 585 unique English, Banglish and Bangla keywords in per-page groups (core, home, events, clubs, resources, helpdesk, bus, notices, forms, lost & found, complaints, auth, search). `keywordsFor(groups)` merges the groups a page needs. Each page renders exactly one `h1`. Private pages (dashboard, verify, reset, admin) are `noindex`, and `robots.ts` disallows them.

**Performance.** The command palette and chatbot panel are dynamically imported on first intent. QR and PDF viewers are lazy. `lucide-react` and `date-fns` use `optimizePackageImports`. The page preconnects to the UploadThing CDN. Run `npm run analyze` for the bundle report.

## User portal and public pages

### Page map

| Area | Route | Notes |
| --- | --- | --- |
| Landing | `/` | Animated hero, live stats, this-week events, next-bus widget, campus-week strip (Friday to Thursday, today highlighted), notices ticker, module cards, FAQ preview, team band |
| Contributors | `/contributors` | The Nurix Hive team: portrait, batch, role, skills, experience, highlights, an email link and a WhatsApp link for urgent contact (data in `src/config/contributors.ts`) |
| Events | `/events`, `/events/[slug]`, `/clubs`, `/clubs/[slug]` | Grid, list and month-calendar views, URL-synced filters, countdown, capacity bar, optimistic register or cancel, QR ticket, `.ics` and Google Calendar, share, related events, Event JSON-LD |
| Resources | `/resources`, `/resources/[id]` | Sidebar filters (sheet on mobile), typo-tolerant search with highlighting, "Previous questions" shortcut, lazy PDF preview, download, bookmark, report |
| Helpdesk | `/helpdesk`, `/helpdesk/[id]` | Category chips with counts, highlighted search, accordion answers, *Was this helpful?*, *Ask the assistant*, FAQPage JSON-LD |
| Bus | `/bus`, `/bus/[code]` | Next-bus finder with a live Dhaka-time countdown, stops timeline, today's timetable |
| Notices and forms | `/notices`, `/notices/[id]`, `/forms` | Pinned and urgent first, class cancellations in red, deadline countdowns |
| Lost and found | `/lost-found`, `/lost-found/new`, `/lost-found/[id]` | Lost/Found tabs, multi-photo post, claim flow, match suggestions, reporter tools (approve or reject claims, mark returned, reopen, delete) |
| Complaints | `/complaints/new`, `/complaints/track`, `/dashboard/complaints[/ticketNo]` | Anonymous option, ticket success screen, owner timeline, track by ticket + email |
| Search | `/search`, Ctrl+K | One grouped search over events, resources, notices, helpdesk and lost & found |
| Dashboard | `/dashboard`, `/registrations`, `/saved-events`, `/bookmarks`, `/my-resources`, `/resources/upload`, `/lost-found`, `/complaints`, `/notifications`, `/profile` | Guarded by `proxy.ts` and the client shell |

### Interaction rules

- **Every mutation shows a toast** (`toastPromise`: loading, then success or a mapped API error).
- **Optimistic updates with rollback:** register or cancel, save event, bookmark, follow.
- **Server cache:** the backend calls `revalidateTag` in each mutation. After a mutation the client invalidates the matching TanStack Query keys and calls `router.refresh()` where a Server Component shows the same data.
- **Errors:** 401 sends guests to `/login?next=…`, 403 and 404 show friendly states, 429 shows the retry hint, and offline shows an offline panel with *Try again*.
- **Filters live in the URL**, so a filtered view can be shared and the back button works.
- **Known gaps:** helpdesk *Was this helpful?* is acknowledged on the client only (no endpoint stores FAQ votes; chatbot answers do store feedback). *Report resource* files a complaint in the `OTHER` category, since there is no dedicated report endpoint.

### Real-world usability

The nine student scenarios are listed near the top of this file: [Real-world usability for a CU student](#real-world-usability-for-a-cu-student).

### Quality checks

See [`docs/TESTING.md`](docs/TESTING.md) for the e2e suite (signup with OTP, login, event registration with QR, resource search, lost item post, complaint submit and track, chatbot question) and the manual release checklist.

## Admin portal

Everything lives under `/admin` (route group `src/app/admin/(console)`), is `noindex`, and uses the same design tokens as the public site, so it supports light and dark mode. The shell (`AdminShell`) is role-aware: the sidebar shows only what the role may open, and opening any other route renders an "access denied" page. **The API enforces the same rules independently** (see the table), so hiding a link is never the only protection.

### Who can do what

| Section | SUPER_ADMIN / ADMIN | CLUB_ADMIN | MODERATOR |
| --- | --- | --- | --- |
| Dashboard | everything | events and registrations only | moderation counts only |
| Events, registrations, live check-in | all clubs | own clubs only | no access |
| Clubs, members | create, edit, delete, assign club admins | edit own club, manage members | no access |
| Notices, bus, departments and courses | full | no access | no access |
| Forms | full | own clubs only | no access |
| Helpdesk knowledge base | full | no access | no access |
| Chatbot: unanswered inbox, unhelpful answers, analytics | full | no access | read and dismiss |
| Resources moderation, lost & found, complaints | full | no access | full |
| Users, audit log, settings | full (changing ADMIN or SUPER_ADMIN accounts needs SUPER_ADMIN) | no access | no access |

### Screens

| Route | What it does |
| --- | --- |
| `/admin/dashboard` | Count-up stat cards, lazily loaded charts (sign-ups per day, registrations per week, complaints by status, top events, top searches, chatbot answered vs unanswered), recent audit activity, role-aware quick actions |
| `/admin/events`, `/new`, `/{id}/edit` | Filterable table; create or edit with banner upload (image pipeline), club, type, capacity, deadline, draft or publish; publish, cancel with a reason (registrants are notified), delete |
| `/admin/events/{id}/registrations` | Search and filter attendees, manual check-in, CSV export |
| `/admin/events/{id}/checkin` | Live check-in: camera QR scanner (native `BarcodeDetector`, with a lazily loaded `jsQR` fallback for Safari and Firefox), manual code entry, "find attendee" search, success / duplicate / invalid feedback with sound, vibration and toast, live counters every 5 s |
| `/admin/clubs` | Club CRUD with logo upload, members and club-admin assignment |
| `/admin/notices`, `/admin/forms` | CRUD, pinning, "visible until" expiry, one-click urgent class-cancellation template (`?template=class-cancel`), recipient count in the toast |
| `/admin/bus` | Route list, stop editor with drag-to-reorder (and up/down buttons), per-trip timetable grid (time, direction, weekdays), live "next bus" preview |
| `/admin/helpdesk` | Knowledge base CRUD with category and keywords, publish toggle, bulk JSON import, unanswered-question inbox with one-click "create entry", unhelpful answers, chatbot analytics |
| `/admin/academics` | Departments and courses CRUD |
| `/admin/resources` | Moderation queue with PDF preview, approve or reject with reason, bulk actions, manage all published and rejected resources |
| `/admin/lost-found` | Hide (reason), restore, resolve, remove (reason), decide claims |
| `/admin/complaints` | Filters (status, priority, category, assignee), detail drawer with timeline, public reply or internal note, status, priority, assign to me |
| `/admin/users`, `/admin/audit-log`, `/admin/settings` | User search, role change, activate or deactivate, force logout, link to a user's activity; filterable audit log; site banner and maintenance switch |

### Interaction rules (every admin mutation)

- Destructive actions open a confirm dialog; actions that affect another person (cancel event, reject, hide, remove) require a reason that is sent to them.
- `toast.promise` shows loading, success or the mapped error. Successes that change public content end with **"Public site updated ✓"**.
- Tables update optimistically and roll back if the request fails, then re-sync from the server.
- Every mutation writes an audit entry and calls the matching `revalidate*` helper on the server, so the public site changes on the next request (matrix below).
- Scheduling: notices and forms support an end date (they hide themselves). Publishing is immediate by design, because time-based revalidation is not allowed in this project; a "publish at" field would need a cron per minute.

### Mutation → tags revalidated

| Admin action | Tags expired | Public effect |
| --- | --- | --- |
| Event create, update, publish, cancel, delete | `events`, `calendar`, `stats`, `event:{id}` | `/events`, `/events/{slug}`, calendar, landing counts |
| Registration, cancellation, check-in | `event:{id}` | seat count on the event page |
| Club create, update, delete, member change | `clubs`, `events`, `calendar`, `forms`, `stats`, `club:{id}` | `/clubs`, club pages, event cards |
| Form create, update, delete | `forms` | `/forms`, chatbot open-forms answer |
| Resource approve, reject, edit, delete, bulk | `resources`, `stats`, `resource:{id}`, `course:{id}`, `department:{id}` | `/resources`, detail page, search; a deleted link stops resolving |
| Department or course change | `departments`, `courses`, `resources`, `notices`, `course:{id}`, `department:{id}` | filters, dropdowns, notices |
| Notice create, update, delete, pin | `notices`, `kb`, `stats`, `notice:{id}` | `/notices`, landing ticker, global search, **chatbot** (auto-synced entry) |
| Campus closure create, update, delete | `calendar`, `buses`, `kb` | `/bus`, landing next-bus widget, event calendar, chatbot calendar and bus answers |
| Bus route or trip change | `buses`, `kb`, `stats`, `bus:{id}` | `/bus`, next-bus API, chatbot bus answers |
| Knowledge base entry CRUD, import, publish | `kb`, `stats`, `kb:{id}` | `/helpdesk`, chatbot retrieval, search |
| Lost & found hide, restore, resolve, remove, claim decision | `lost-found`, `stats`, `lf:{id}` | `/lost-found`, detail page, matches |
| Settings (banner, maintenance) | `settings` | banner on every public layout; maintenance page for visitors |
| User role or activation, complaint update | `stats` | dashboard numbers (complaints and users are private, never cached publicly) |

## Production hardening

### Security review (OWASP Top 10, 2021)

| Risk | How it is covered | Verified by |
| --- | --- | --- |
| A01 Broken access control | Permission matrix (`src/lib/auth/rbac.ts`) enforced in the proxy **and** in every admin handler; club scoping in services; ownership filters (`userId`) on registrations, bookmarks, notifications, complaints and claims; contact details only for the reporter and an approved claimer | `tests/e2e/admin.spec.ts` (role matrix, 401/403, club scope), `tests/e2e/edge.spec.ts` (IDOR) |
| A02 Cryptographic failures | bcrypt cost 12; OTPs hashed; JWT HS256 with a 32+ character secret; HSTS preload; cookies `httpOnly`, `SameSite=Lax`, `Secure` in production | unit tests, header check |
| A03 Injection | Prisma parameters and tagged `$queryRaw` templates only; Zod `.strict()` on every body, query and param; CSV formula neutralisation; no `dangerouslySetInnerHTML` | route audit script: 142 handlers, none mutating without validation |
| A04 Insecure design | Atomic seat claim, conditional check-in flip, single-use OTPs with attempt limits, anti-enumeration (generic login and ticket errors) | race test (capacity 1, two users), duplicate check-in test |
| A05 Misconfiguration | Strict CSP with explicit UploadThing hosts, `X-Frame-Options: DENY`, `nosniff`, `Permissions-Policy`, COOP, `poweredByHeader` off, errors never include stack traces | headers inspected on the production server |
| A06 Vulnerable components | `npm audit --omit=dev`: **0 vulnerabilities**; transitive `effect`, `mysql2` and `deepmerge-ts` pinned to patched versions via `overrides`; all dependencies pinned to exact versions (`.npmrc` `save-exact`) | `npm run audit:prod` |
| A07 Authentication failures | Rate limits (10 auth calls per 15 min per IP), per-account lockout after 5 failures, email verification required, token versioning revokes sessions on role change, deactivation, password change and force logout | deactivated-user and unverified-login tests |
| A08 Integrity failures | Upload provenance (tracked UploadThing key owned by the caller), magic-byte checks, image re-encoding, secret-guarded cron and revalidate endpoints (constant-time compare) | upload tests |
| A09 Logging failures | Audit log for every admin mutation (actor, entity, IP), structured logger with secret redaction | audit viewer |
| A10 SSRF | The server fetches only fixed hosts (Brevo, UploadThing, Anthropic); no user-supplied URLs are fetched | code review |

Additional checks:

- **Secrets:** a scan of the real `.env` values against the client bundle (`.next/static`), `public/`, every tracked file and the **entire git history** found none; `.env` has never been committed; `NEXT_PUBLIC_` variables are only `APP_NAME`, `APP_URL` and the Turnstile **site** key.
- **CSRF:** `SameSite=Lax` cookies plus an Origin check on every mutating route (the two secret-guarded server-to-server endpoints are exempt).
- **CSP and UploadThing:** images and PDFs load from `utfs.io` and `*.ufs.sh` (`img-src`, `frame-src`), uploads connect to `*.uploadthing.com` (`connect-src`). `script-src` keeps `'unsafe-inline'` because Next.js injects inline bootstrap scripts; moving to nonces would make every page dynamic and defeat the ISR cache, so this is a conscious trade-off.
- **Known dev-only advisories:** `npm audit` still lists 5 high findings under `eslint-config-next` (`braces`, `micromatch`, `fast-glob`): regex DoS in lint tooling that never ships to production, with no patched release available.

### Performance (measured)

Production build (`next start`), Chromium on the same machine as the server, warm cache, no network throttling. **These are local numbers: add network latency and the CDN edge on Vercel.**

| Page | TTFB | LCP | JS transferred | CLS |
| --- | --- | --- | --- | --- |
| `/` | 11 ms | 304 ms | 381 KB | 0.001 |
| `/events` | 30 ms | 260 ms | 334 KB | 0.001 |
| `/clubs` | 6 ms | 220 ms | 227 KB | 0.004 |
| `/resources` | 6 ms | 176 ms | 261 KB | 0.001 |
| `/bus` | 6 ms | 224 ms | 171 KB | 0.016 |
| `/notices` | 6 ms | 292 ms | 181 KB | 0.004 |
| `/helpdesk` | 6 ms | 248 ms | 146 KB | 0.001 |
| `/lost-found` | 6 ms | 208 ms | 208 KB | 0.001 |
| `/login` | 9 ms | 312 ms | 142 KB | 0.001 |

- **ISR is hit:** every public page returns `x-nextjs-cache: HIT` with `Cache-Control: s-maxage=2592000, stale-while-revalidate=28944000`; the entry is dropped only by a tag mutation. All measured pages are under the 0.4 s target.
- **Bundle:** 97 chunks, 886 KB gzip across the whole app; the largest shared chunk is React DOM (71 KB gzip). The QR decoder, charts, PDF preview, chatbot panel and command palette are dynamic imports, so they never ship with other pages. `date-fns` (unused) was removed.
- **Layout shift:** the auth layout caused CLS 0.115 on `/signup`; the brand panel is now `sticky h-dvh` and the form column top-aligned.
- **Database:** `npm run db:explain` prints plans for 20 hot queries (`-- --force` disables sequential scans to prove an index can serve the query). Every list, feed, queue and lookup uses an index. The substring searches (`ILIKE '%term%'`) on events, notices, lost & found and users could not use B-tree indexes, so migration `20261011000000_trigram_search_indexes` adds partial `pg_trgm` GIN indexes; notice and lost & found searches now use them.
- **Neon cold start:** the pool waits up to 15 s for a connection and interactive transactions up to 15 s to start (`maxWait`), so a suspended compute causes one slow request instead of a `P2028` error; `npm run db:deploy` retries `migrate deploy` with backoff. Runtime uses the pooled (`-pooler`) URL, migrations the direct URL. Pool size is 5 per serverless instance because PgBouncer fans connections in.
- **Runtime:** Node.js (the Next 16 default; `export const runtime` is not allowed with Cache Components). `maxDuration` is set on uploads (60 s), the chatbot (30 s), CSV export, bulk review, import and the cron routes.

### Scalability review (1M+ users)

- **Pagination:** every list endpoint is cursor-based with a capped `limit` (max 50). The remaining unbounded `findMany` calls were audited: they read small bounded sets (bus routes, departments, a user's own follows, clubs) or are bounded by an `in` list; the two that could grow (claims per item, chat messages per session) now have a `take` limit.
- **No N+1:** list endpoints use one `select` with joins; fan-out reads batches by id cursor.
- **Fan-out:** event reminders, cancellations and notices run after the response in batches of 500–1000 recipients (`notifyUsers` + `sendBulkEmail`), keyset-paginated, and reminders are idempotent (`reminderSentAt` claimed first). The design is queue-friendly: swapping `after()` for a queue consumer changes one call site per flow.
- **Idempotency and counters:** registration is an atomic conditional `UPDATE` (no overselling, repeated requests are safe), check-in is a conditional status flip (a ticket can be used once even with two scanners), counters are denormalised and updated in the same transaction as the row change, club member counts are recomputed in the transaction.
- **Housekeeping:** `GET /api/cron/maintenance` prunes expired rate-limit windows and OTPs (`RateLimit.resetAt` and `EmailOtp.expiresAt` are indexed).
- **Rate limiting** is stored in Postgres, so limits hold across serverless instances.

### Deployment checklist (Vercel + Neon)

1. **Region:** deploy functions to `iad1` (US East, set in `vercel.json`) and create the Neon project in **us-east-1 or us-east-2**; keep them in the same region to avoid cross-region round trips (the project database is in us-east-2).
2. **Environment variables:** add every variable from the table above to the Vercel project (Production and Preview). `DATABASE_URL` must be the pooled URL (`-pooler`), `DIRECT_URL` the non-pooled one. Never set `E2E_MAIL_CAPTURE` in Vercel (it is ignored in production anyway).
3. **Build:** `vercel.json` runs only `npm run build` (`prisma generate && next build`). **Migrations are never applied automatically**: a deploy or preview build cannot touch the database. Apply them yourself, once per schema change, with `npm run db:deploy` (`prisma migrate deploy` with retries while Neon wakes up) using the direct `DIRECT_URL`.
4. **Cron:** `/api/cron/reminders` (12:00 UTC) and `/api/cron/maintenance` (21:30 UTC) run with `Authorization: Bearer $CRON_SECRET`, which Vercel sends automatically when `CRON_SECRET` is set.
5. **Production seed:** run once from a trusted machine with the production `DATABASE_URL`: `npm run db:seed` (creates the four staff accounts from `ADMIN1..4_*` and the demo content). Remove demo content and rotate the seed passwords afterwards; sample knowledge entries are flagged `isSample`.
6. **Health check:** `GET /api/health` returns `200` with database latency, `503` if the database is unreachable. Point the uptime monitor at it. It also warms a suspended Neon compute; on a paid plan add a 5-minute monitor.
7. **Brevo:** disable the *Authorised IPs* restriction (Vercel has no fixed egress IP) or email fails with 401.
8. **UploadThing:** the public URL must be reachable at `/api/uploadthing` for the upload callback.
9. **After go-live:** rotate the Neon password, Brevo key, UploadThing token, JWT secret and every seed password; confirm `npm run audit:prod` is clean in CI.

### Testing and documentation checks

`docs/TESTING.md` lists the unit and end-to-end suites; `docs/QA_REPORT.md` lists everything tested with results and known limitations.

```bash
npm test                    # Vitest unit tests
npm run test:e2e            # Playwright (starts its own dev server on port 3100)
npm run docs:verify-db      # databasedesign.md matches prisma/schema.prisma
npm run docs:verify-readme  # every route, env variable and npm script in this README is real
```

Other documents: [`databasedesign.md`](databasedesign.md) (schema), [`docs/REQUIREMENTS_AUDIT.md`](docs/REQUIREMENTS_AUDIT.md) (hackathon requirements vs. code), [`docs/SUBMISSION_CHECKLIST.md`](docs/SUBMISSION_CHECKLIST.md) (manual steps), [`pending.md`](pending.md) (not built, in Bangla), [`demovideoscript.md`](demovideoscript.md) (demo script, in Bangla), [`SECURITY.md`](SECURITY.md), [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`CHANGELOG.md`](CHANGELOG.md).

## Credits

Designed and developed by the **Nurix Hive** team for City University, Bangladesh.
