# CampusOS QA report

Built by the **Nurix Hive** team for City University, Bangladesh. This report covers the admin portal and the hardening pass. Numbers marked *local* were measured on the development machine and will differ on Vercel (add network latency and the CDN).

## 1. Result at a glance

| Check | Result |
| --- | --- |
| `npm run lint` | clean, zero warnings |
| `npx tsc --noEmit` (app) and `tsc -p tsconfig.test.json` (tests, scripts, configs) | clean |
| `npm run build` | passes (also with devDependencies absent, as on Vercel) |
| `npm test` (Vitest) | 172 / 172 passed |
| `npm run test:e2e` (Playwright, Chromium) | 91 passed, 0 failed, 1 skipped |
| `npm audit --omit=dev` | 0 vulnerabilities |
| Secret scan (client bundle, tracked files, git history) | none found |

## 2. What was tested

### Security (OWASP Top 10)
Reviewed per route and by test; the table is in the README under *Production hardening*. Highlights:

- Every `/api/admin/*` route is guarded twice: `proxy.ts` (401/403) and `requirePermission()` in the handler. Role matrix verified for SUPER_ADMIN, ADMIN, CLUB_ADMIN and MODERATOR on both UI (menu hidden, route blocked) and API.
- IDOR: a second student cannot read another student's QR ticket, complaint or notification (404/403) and cannot reach admin stats (403). Covered by `edge.spec.ts`.
- Zod `.strict()` on every body, query and param; same-origin check on every mutation; rate limits stored in Postgres.
- Cookies are `httpOnly`, `SameSite=Lax`, `Secure` in production; CSP allows UploadThing and Cloudflare Turnstile hosts only.
- Dependencies are pinned to exact versions; transitive advisories fixed with `overrides`.

### Accessibility (axe-core, WCAG 2.1 A/AA, serious and critical fail the run)
15 public pages and 15 admin pages, each in light and dark mode, plus a reduced-motion check.

Fixed in this pass:

- Secondary text (`--fg-subtle`) failed contrast on tinted surfaces (ratio 4.27 to 4.37). Darkened to `#5c657a`.
- File inputs in the image and PDF dropzones had no accessible name (axe `label`, critical). Added labels.

### Bug hunt (edge cases)
Automated in `tests/e2e/edge.spec.ts` and `admin.spec.ts`:

- Wrong verification code: clear error, account stays unverified, login refused (403).
- Unverified login refused; garbage or tampered session cookie treated as signed out.
- HTTP 429 shows the wait time; offline submit explains the problem and recovers.
- Oversized upload (413), wrong file type and wrong purpose refused.
- Duplicate lost-and-found claim (409) and claiming your own post refused.
- Deleted or unknown resource link: friendly not-found page and clean 404 from the API.
- Capacity race (capacity 1, two users), double check-in of one QR, deactivated user with a live session, expired JWT: covered by the event and admin suites.

### Performance (*local*, production build, warm cache)
Landing page: TTFB 11 ms, LCP 304 ms, CLS 0.001. All measured public pages are under 0.4 s LCP with CLS under 0.02. ISR is served as `HIT` and is dropped only by tag mutations. Full table in the README.

### Scalability
Cursor pagination with capped limits everywhere, no N+1 reads, batched fan-out (500 to 1000 recipients per batch), idempotent reminders, atomic seat claim and check-in, counters updated inside transactions, daily cron prunes expired rate-limit and OTP rows. `npm run db:explain` shows indexes used on 20 hot queries.

### Responsive and visual pass
Public pages checked for horizontal overflow at 360, 390, 768 and 1280 px (production build): none after the fixes below. Admin pages were checked in light and dark at desktop widths (one h1 per page, no overflow).

## 3. End-to-end suite

Specs: `auth`, `events`, `campus`, `admin`, `edge`, `a11y`. Run against `next dev` on port 3100 with `E2E_MAIL_CAPTURE=1` (test-only mail capture, ignored in production) and Turnstile blanked for the test server only.

Final run on a stable tree: **91 passed, 0 failed, 1 skipped** (17.4 min). This includes all 60 axe checks (30 pages x light and dark), the reduced-motion check, the admin role matrix, and the edge-case suite. The skipped test is a data-dependent guard (it skips itself when the seeded data lacks an open event or a second club).

## 4. Bugs found and fixed in this pass

| Bug | Fix |
| --- | --- |
| Header logo unreadable in light mode; header wrapped to two lines | Fixed gradient stops, single `CampusOS` logo, search shrunk to an icon or compact pill, `nowrap` |
| Every signup, login and forgot-password returned 403 "Bot verification failed" once `TURNSTILE_SECRET_KEY` was set | The server required a token but no form sent one. Added a Turnstile widget (`useTurnstile`) to the three forms |
| Vercel build failed ("npm run build exited with 1") | Vercel skips devDependencies. Moved build-time packages (Tailwind loader, TypeScript, Prisma, `@types/*`) to dependencies and excluded tests, scripts and tool configs from the build type check (`tsconfig.test.json` still checks them locally) |
| `prisma migrate deploy` ran on every Vercel build | Removed from `vercel.json`; migrations are applied manually with `npm run db:deploy` |
| Landing hero wider than the screen on phones (text and search clipped); header overflow at 360 px | Single-column grid is now `grid-cols-1` with `min-w-0`; phones get a bottom tab bar instead of a crowded header |
| Phone navigation | New app-style bottom tab bar (Home, Events, Resources, Bus, More) below 768 px only; tablets and desktops are unchanged |
| `/signup` layout shift (CLS 0.115) | Sticky brand panel and top-aligned form column |
| Nested `<main>` on the not-found page | Replaced with a section |
| Chatbot widget showed in the admin console | Moved to public and user layouts |
| Neon cold start caused `P2028` | Pool and transaction wait options; retrying migrate script |
| Contrast failures (see section 2) and unlabeled file inputs | Fixed |
| Email delivery logs hid the real cause | Brevo's error text is now logged (never the message body) |

## 5. Known limitations and remaining risks

1. **Email delivery depends on Brevo settings, not code.** Brevo answers 401 "unrecognised IP address" when *Authorised IPs* is enabled; Vercel has no fixed egress IP, so signup and password-reset codes fail with `EMAIL_DELIVERY_FAILED` until the restriction is disabled (Brevo, Security, Authorised IPs). The sender is a Gmail address: Gmail's DMARC policy and a missing custom DKIM signature mean messages can land in spam or be rejected. Use a sender on your own domain with SPF, DKIM and DMARC records before launch.
2. PDF upload is not covered by an automated end-to-end test (manual check only).
3. Unknown dynamic pages (for example a deleted resource) answer HTTP 200 with the not-found UI and `noindex`, because the page streams before `notFound()` runs. Crawlers see `noindex`.
4. No "publish at" scheduling for notices (expiry only).
5. `script-src` keeps `'unsafe-inline'` (Next.js inline bootstrap scripts); a nonce-based CSP would remove it.
6. Five dev-only `npm audit` findings remain under `eslint-config-next` (lint tooling, never shipped, no patched release).
7. Helpdesk "helpful" feedback is stored client-side only; reporting a resource goes through a complaint.
8. Maintenance mode covers pages with a full-screen overlay (the cached flag expires with the `settings` tag) and blocks API writes in the proxy, which caches the flag for 10 seconds per instance and fails open if it cannot be read. Page HTML is still delivered to visitors underneath the overlay.
9. Vercel's first request after idle can take 1 to 3 seconds (cold function plus Neon wake-up); later requests are served from the cache.
10. Performance numbers are local measurements, not Vercel measurements.
