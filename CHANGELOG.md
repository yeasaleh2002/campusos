# Changelog

All notable changes to CampusOS. Dates are Asia/Dhaka. Versions follow the milestones of the hackathon build; the app itself is not published to npm.

## 0.9.0 - Pre-submission fixes and campus calendar (2026-10-08)

### Added

- **Campus calendar rule** (`src/config/campus-calendar.ts`): City University is open Friday to Tuesday and closed Wednesday and Thursday, with no bus service on those days. Weekdays are always computed in Asia/Dhaka.
- `CampusClosure` model and migration `20261013000000_campus_calendar`; public `GET /api/calendar`; admin `GET|POST /api/admin/calendar/closures` and `PATCH|DELETE /api/admin/calendar/closures/{id}`; the "Campus calendar" admin page; permission `calendar:manage`; cache tag `calendar` (with `buses` and `kb`).
- Bus: `BUS_DAY_NOT_ALLOWED` validation and the database constraint `BusTrip_no_off_days`; off-day responses (`service`, `reason`, `message`, `nextServiceAt`) on `/api/bus/next` and `/api/bus/routes/{code}`; "No bus service today" UI with a weekday selector and a countdown only on service days.
- Chatbot: intents for "is the university open today/tomorrow", "next working day" and "which days does the bus run", in English, Banglish and Bangla.
- Events: `confirmOffDay` / `OFF_DAY_CONFIRMATION_REQUIRED`, off-day badges, Friday-first calendar, Friday to Thursday "This week" filter.
- `Resource.courseName` (migration `20261012000000_resource_course_name`) so a student can upload for a course that is not in the list.
- **Contributors page** (`/contributors`, linked from the footer and a team band on the landing page): portrait, role, skills, experience and a contact link for each team member. Data lives in `src/config/contributors.ts`; photos are resized WebP files in `public/contributors/`. Each person has their batch (CSE 62, Day), an email link and a WhatsApp link for urgent contact.
- **Install button in the footer** (centred): opens the browser's install prompt where it exists (Chrome, Edge, Android) and shows the manual steps elsewhere (Safari on iPhone and iPad, Firefox); hidden once the app is installed. The PWA manifest already existed.
- **Landing page redesign:** animated colour glows, an orbiting product preview with an assistant chat card, highlight chips, a campus-week strip (Friday to Thursday, off days marked, today highlighted), richer module and scenario cards, a team band, and a shine on the main buttons. Scroll reveals use CSS scroll-driven animation (no JavaScript, content is never hidden), and everything respects `prefers-reduced-motion`.
- `docs/REQUIREMENTS_AUDIT.md`, `docs/SUBMISSION_CHECKLIST.md`, regression tests (`tests/unit/regressions.test.ts`, `tests/e2e/regressions.spec.ts`), calendar tests (`tests/unit/campus-calendar.test.ts`, `tests/e2e/campus-calendar.spec.ts`).

### Performance

- **The landing page is now fully static.** It used to render four live sections per request (`connection()`), which started a server function on every visit and rebuilt hourly cache keys, so the first visitor of each hour waited for the database. One tag-cached entry (`getHomeFeed`) now holds everything, and the time-dependent parts (this week's events, upcoming count, "2 hours ago", next bus, today in the campus-week strip) are finished in the browser from the Dhaka clock. `/` is served from the CDN with its data inline.
- **`proxy.ts` no longer runs for public and auth pages** (matcher limited to `/api`, `/admin` and the signed-in area). Before, every page view started the proxy and could trigger a second request to `/api/settings/public`. Maintenance mode now covers pages with a full-screen overlay driven by the cached flag; the proxy still refuses API writes, and read-only API calls skip the maintenance lookup.
- The bus schedule module no longer imports zod, which removed about 30 kB (gzip) of JavaScript from every page that shows the next-bus widget (`src/server/domain/bus-schedule-schemas.ts` holds the schemas).
- framer-motion's animation features load on demand (`LazyMotion` with a dynamic import); the hero heading paints immediately instead of waiting for an entrance animation.

### Fixed

- **FAQ answers that contradicted the campus week.** The database still held an old entry saying buses run "Saturday to Thursday" and not on Friday. The FAQ now says it correctly (buses and classes run Friday to Tuesday; Wednesday and Thursday are the off days), with new entries for Friday, "weekends", classes on off days, public holidays and "is the university open today?", and Banglish spellings of the off days (budhbar, brihospotibar, ...) as search keywords. The seed also retires sample FAQ entries it no longer contains, so an old wrong answer cannot stay behind. Covered by `tests/unit/faq-calendar.test.ts`.
- **Staff landed on the student dashboard.** Going from the admin console to the public site and pressing "Dashboard" opened the student dashboard. The header, the account menu and the footer now follow the role: staff get "Admin dashboard" (`/admin/dashboard`), with "My student view" as a separate menu item, and everyone else gets `/dashboard`.
- The staff sign-in page had no way back to the public site; it now has a "Back to home page" button and a "Home page" link.
- **Notifications are plain text.** Clicking a notification title no longer navigates anywhere (list and dashboard overview); the round button still marks it as read.
- **Admin and moderator resource preview.** The preview button and dialog only appear when the resource has a PDF or an image (`GET /api/admin/resources` now also returns `mimeType`); PDFs and images each render properly and the dialog has an "Open the file in a new tab" fallback.
- **Maintenance page after login.** Signing in sent some users to "We will be right back". The e2e suite flipped the real, shared maintenance flag, and the proxy caches that flag, so the setting leaked to real visitors. The toggle test now runs only when `E2E_ALLOW_MAINTENANCE_TOGGLE=1`, and a regression test checks that login lands on the dashboard without the maintenance page.
- **Add to calendar.** The Google Calendar item opened in the same tab and replaced the event page. The dropdown now supports `external` links (`target="_blank"`, `rel="noopener noreferrer"`).
- **Custom course on resource upload.** The course list was the only choice. A "My course is not listed" toggle stores a typed course name; the API rejects a request that sends both `courseId` and `courseName`.
- **Lost & found status not refreshing.** After changing a post's status the board and "my posts" kept the old value until a reload. Mutations now call `invalidateLostFound`, which refreshes both lists.
- **Lost & found detail page prerender error.** The "possible matches" cards print the relative post time, which needs the request time. They are now rendered after `await connection()`.
- The "No bus service today" card faded in over 300 ms even for visitors who ask for reduced motion; it now appears instantly when `prefers-reduced-motion` is set (caught by the Playwright accessibility suite).
- Signup and login returned 403 when Cloudflare Turnstile was configured: the forms now render the Turnstile widget and send its token.
- Vercel build failed because build tools (Tailwind, TypeScript, Prisma, `@types/*`) were dev dependencies. They are regular dependencies now, `vercel.json` sets `buildCommand`, and `prisma migrate deploy` no longer runs during the build.
- Brevo errors are logged with the provider's message so a blocked IP is visible in the Vercel logs.
- The hero section overflowed on small screens; mobile now has a bottom tab bar and the hamburger is hidden below the `md` breakpoint.
- The week used to start on Saturday and Friday was treated as the weekly holiday. The old helper `dhakaWeekRange` was removed.

### Changed

- Seeded bus trips run Friday to Tuesday only; seeded events are never placed on Wednesday or Thursday.
- The knowledge base entries for buses state the working days and the no-service rule.
- Playwright blanks the Turnstile keys for its own test server only.

## 0.8.0 - Admin portal, hardening, performance (earlier)

- Admin console (events, clubs, resources, helpdesk, notices, forms, bus, lost & found, complaints, users, audit log, settings).
- Security review, rate limiting, Zod `.strict()` validation everywhere, tag-based cache invalidation, performance measurements, and the Playwright / axe suites.

## 0.1.0 - 0.7.0 - Foundation (earlier)

- Design system, auth with email OTP, events and clubs, resource hub, helpdesk and chatbot, bus schedule, notices and forms, lost & found, complaints.
