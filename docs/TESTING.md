# Testing CampusOS

This guide covers automated checks (lint, types, unit tests, Playwright e2e) and a manual checklist for the flows that cannot run on a laptop.

## 1. Automated checks

| Command | What it checks |
| --- | --- |
| `npm run lint` | ESLint (including React Compiler and a11y rules). Must print nothing. |
| `npm run typecheck` | `tsc --noEmit` in strict mode. |
| `npm test` | Vitest unit tests (domain logic, validators, search ranking). They never touch the database. |
| `npm run build` | Production build with Cache Components. Catches runtime-API-outside-Suspense mistakes. |
| `npm run test:e2e` | Playwright end-to-end tests (below). |

## 2. End-to-end tests (Playwright)

### How it runs

`playwright.config.ts` starts `next dev` on **port 3100** with `E2E_MAIL_CAPTURE=1`, so it never collides with a server on 3000.

**OTP without a real inbox.** The email service has a test-only hook (`src/server/services/mail-capture.ts`). When `E2E_MAIL_CAPTURE=1` **and** `NODE_ENV` is not `production`, outgoing email is appended to `.e2e/mail.jsonl` instead of going to Brevo. The tests read the newest message for an address and extract the 6-digit code from its subject. The hook cannot turn on in production, because `mailCaptureEnabled` checks `isProduction` first. `.e2e/` is git-ignored.

**Test accounts.** A worker-scoped fixture (`tests/e2e/fixtures.ts`) signs up and verifies one fresh account through the API, logs in once, and reuses the session cookie for every authenticated test. This keeps the rate-limited auth endpoints (10 per 15 minutes per IP) well under the limit: about 6 calls per run. Staff accounts are logged in through `/api/auth/admin/login` using `ADMIN1..4_EMAIL/PASSWORD` from `.env` (never printed). Under the E2E flag only, the auth rate limit is raised to 500 so the larger suite does not lock itself out; in production it stays at 10.

### What is covered

| File | Scenario |
| --- | --- |
| `contributors.spec.ts` | Footer link opens `/contributors`, both people show with loaded portraits, batch, a `mailto:` link and a `wa.me` WhatsApp link; the landing page fills in stats, next-bus panel, campus-week strip (7 days, today marked) and the team band |
| `campus-calendar.spec.ts` | Wednesday/Thursday off-day UI with a mocked Dhaka clock, weekday selector, `/api/bus/next` shape, `BUS_DAY_NOT_ALLOWED`, closure CRUD, `confirmOffDay` for events |
| `portal-fixes.spec.ts` | Admin sign-in "Back to home page" link; staff get the admin dashboard from the account menu and the footer; a notification title is not a link and clicking it does not navigate; admin resource preview button only for a PDF or an image (mocked list) |
| `regressions.spec.ts` | The four pre-submission bugs: login lands on the dashboard (no maintenance page), Google Calendar opens in a new tab, custom course on upload, lost & found status refreshes without a reload |
| `auth.spec.ts` | Sign up through the form, enter the OTP, land on the dashboard, sign in again; wrong password inline error; guest redirect with `?next=` |
| `events.spec.ts` | Open an event, register, see the QR ticket dialog, find it under *My tickets*, cancel; calendar view toggle |
| `admin.spec.ts` | Role matrix for ADMIN, CLUB_ADMIN and MODERATOR (menu items, blocked route, API 403), students and anonymous users are refused, event lifecycle (draft, publish, appears on the public API, cancel with reason, delete), notice posted and deleted with the public board following, site banner and maintenance mode (503 for visitors, staff unaffected), live check-in by "find attendee", duplicate check-in, capacity-1 race with two simultaneous registrations, deactivated user with a live session, club-admin scope |
| `edge.spec.ts` | Wrong OTP, unverified login, garbage session cookie, HTTP 429 message, offline submit and recovery, oversized and wrong-type uploads, IDOR (another student's ticket QR, complaint, notification), duplicate lost & found claim, unknown resource link |
| `a11y.spec.ts` | axe-core WCAG 2.1 A/AA (serious and critical must be zero) on 15 public and 15 admin pages in light and dark mode; reduced-motion check |
| `campus.spec.ts` | Resource search + *Previous questions* filter; upload-form validation; post a lost item and delete it; file a complaint and track the ticket; ask the chatbot a question |

### Running

```bash
npm run test:e2e                       # headless, starts the dev server for you
npx playwright test --ui               # interactive
npx playwright test auth.spec.ts       # one file
npx playwright show-report             # last HTML report
```

Requires a populated database (`npm run db:seed`, which also creates the four staff accounts) for the events and resources scenarios. The event test skips itself when no event is open for registration.

### Known limits

- **PDF upload is not automated.** The browser uploads to UploadThing, which then calls this app back with the file metadata. UploadThing cannot reach `localhost`, so the upload never completes locally. Test it on a deployed preview (section 3).
- **Email is not really delivered in e2e**, by design. Brevo delivery is checked manually.
- Tests create real rows (an account, a complaint). They clean up what they can (event registration, lost-item post) and use unique `e2e.*@example.com` addresses.

## 3. Manual checklist (before a release)

1. **Fresh sign-up with a real inbox:** the OTP email arrives within a minute; *Resend code* is disabled for 60 s and then works; a wrong code shows an inline error; five wrong codes lock the code.
2. **Password reset:** request a code, set a new password, confirm the old password no longer works and other sessions are signed out.
3. **PDF upload (deployed preview):** upload a PDF under 16 MB, submit; it shows as *Pending* in *My uploads*; approve it in the admin console; it appears in search; download and preview work.
4. **Images:** post a lost item with 4 photos; the card shows the first one; oversized or non-image files are rejected with a clear message.
5. **Event day:** register, open the QR on a phone, scan it in the admin check-in page; a second scan reports *already checked in*.
6. **Theme and motion:** switch light, dark and system; reload with no flash; enable *reduce motion* in the OS and confirm animations stop.
7. **Keyboard only:** Tab through the navbar, skip link, Ctrl+K palette, a dialog (focus trapped, Esc closes) and a form with errors.
8. **Offline:** turn the network off; lists show the offline message with *Try again*; mutations show a toast.

## 4. Responsive check

Open these pages at 360, 768, 1280, 1920, 2560 and 3840 px wide and confirm there is no horizontal scrollbar: `/`, `/events`, `/resources`, `/bus`, `/lost-found`, `/helpdesk`, `/login`, `/signup`, `/admin/login`. A quick programmatic check is `document.documentElement.scrollWidth - document.documentElement.clientWidth === 0`.

## 5. Reading failures

- `No OTP email captured`: the dev server was not started with `E2E_MAIL_CAPTURE=1` (do not reuse a server started by hand).
- `429 RATE_LIMITED` on signup or login: you ran the suite more than once in 15 minutes from the same IP.
- Trace files for failed tests are in `test-results/`; open with `npx playwright show-trace <zip>`.
