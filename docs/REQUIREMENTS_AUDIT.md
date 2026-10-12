# Requirements audit

Audited against the two hackathon PDFs: the **Rulebook** and the **Problem Statement** ("CPCCU AI-Powered Web App Development & Deployment Hackathon 2026"). Each row points to evidence in this repository. Status values:

- **DONE**: implemented and covered by a test or a visible page.
- **PARTIAL**: exists but incomplete. The Action column says what closes it.
- **MISSING**: not present.
- **MANUAL**: a human step the code cannot do (deployment, forms, recording).

## A. Problem statement: module and functional requirements

| ID | Requirement | Source | Status | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| P-01 | Build at least 2 of the 4 modules | Problem statement, "Modules" | DONE | All four are built: Club & Event Engine, Resource Hub, Smart Helpdesk, Lost & Found / Complaint Box (`src/app/(public)/*`, `src/server/services/*`) | None |
| P-02 | Club & Event Engine: clubs, events, registration | Problem statement, Module 1 | DONE | `/clubs`, `/events`, `registration.service.ts`, `tests/e2e/events.spec.ts`, `tests/unit/event-registration.test.ts` | None |
| P-03 | Event extras: QR ticket, check-in, calendar export | Problem statement, Module 1 | DONE | QR ticket, `/admin/events/[id]/checkin`, `.ics` and Google Calendar link (opens in the same tab after the Task 8 fix), `tests/unit/checkin.test.ts` | None |
| P-04 | Resource Hub: upload, browse, search, moderation | Problem statement, Module 2 | DONE | `/resources`, `/dashboard/resources/upload`, `/admin/resources`, `resource-search.ts`, `tests/unit/resource-search.test.ts` | None |
| P-05 | Resource upload for a course that is not listed | User bug list (Task 8) | DONE | `Resource.courseName`, "My course is not listed" toggle in `upload-form.tsx` | None |
| P-06 | Smart Helpdesk: searchable answers, chatbot, escalation | Problem statement, Module 3 | DONE | `/helpdesk`, `chatbot.service.ts`, `knowledge.service.ts`, unanswered-question inbox, `tests/unit/chatbot.test.ts` | None |
| P-07 | Lost & Found: post, claim, status updates | Problem statement, Module 4 | DONE | `/lost-found`, claims, `lost-found.service.ts`, status refresh without reload (`invalidateLostFound`) | None |
| P-08 | Complaint Box: file, track, status timeline | Problem statement, Module 4 | DONE | `/complaints/new`, `/complaints/track`, ticket numbers `CU-YYYY-NNNNNN`, anonymous mode | None |
| P-09 | Core modules work end to end (UI, API, DB) | Problem statement, must-haves | DONE | Playwright suites `events`, `campus`, `admin`, `edge`; `docs/QA_REPORT.md` | None |
| P-10 | Working authentication (signup, login, logout) | Problem statement and Rulebook | DONE | Email OTP signup, login, forgot/reset password, Turnstile; `tests/e2e/auth.spec.ts` | Brevo "Authorised IPs" must be deactivated by the owner (see SUBMISSION_CHECKLIST) |
| P-11 | Role-based access (student, admin) | Problem statement | DONE | 5 roles, permission map in `src/lib/auth/rbac.ts`, `tests/unit/rbac.test.ts`, double guard in `proxy.ts` | None |
| P-12 | Admin side to manage content | Problem statement | DONE | `/admin/*` console, 18 admin routes, audit log | None |
| P-13 | Campus-specific rules (Friday to Tuesday open, Wed/Thu closed, no bus Wed/Thu) | University calendar rule, `GLOBAL_RULES.md` | DONE | `src/config/campus-calendar.ts`, `CampusClosure`, `tests/unit/campus-calendar.test.ts`, `tests/e2e/campus-calendar.spec.ts` (7/7) | None |
| P-14 | Seed data so the app is demo-ready | Problem statement | DONE | `npm run db:seed` (30 events, 60 resources, 86 KB entries, 6 bus routes, notices, forms, lost & found posts) | None |
| P-15 | No exposed credentials | Problem statement, must-haves | DONE | `.env` ignored by git, `.env.example` holds placeholders, `src/lib/env.ts` validates | Final secret scan in Step 7 |
| P-16 | Input validation and safe errors | Rulebook, security | DONE | Zod `.strict()` on every route, `{success,data,error,meta}` envelope, `tests/unit/security.test.ts` | None |

## B. Problem statement: deliverables

| ID | Requirement | Source | Status | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| D-01 | Live deployed link with working auth | Problem statement and Rulebook | MANUAL | `vercel.json`; production URL `campusos-tawny.vercel.app` | Redeploy after the latest changes, then smoke-test signup and login (checklist items 1–3) |
| D-02 | README: what it is and the problem it solves | Problem statement | DONE | README "Overview", "Problem → solution scenarios" | None |
| D-03 | README: modules and features | Problem statement | DONE | README "Modules" (with page routes) | None |
| D-04 | README: tech stack | Problem statement | DONE | README "Tech stack" | None |
| D-05 | README: how to run locally | Problem statement | DONE | README "Local setup"; `npm run docs:verify-readme` checks every `npm run` script it mentions | None |
| D-06 | README: env variables, seeding, demo credentials | Problem statement | DONE | README "Environment variables", "Seed and demo credentials" (names only, no secrets) | Real values go into the submission form only (MANUAL) |
| D-07 | README section "real-world usability for a CU student" with concrete scenarios | Problem statement | DONE | README "Real-world usability for a CU student": 9 named scenarios with the steps and the module used | None |
| D-08 | Demo video script (Problem, Solution, Demo, Features, Technical) | Problem statement | DONE | `demovideoscript.md`: 21 segments, 12:00 total, 5:00 cut, pre-recording checklist | Recording is D-09 |
| D-09 | Record the video and share a public Google Drive link | Problem statement | MANUAL | Script is ready (D-08) | Record, upload, set sharing to "anyone with the link" |
| D-10 | Join the CPCCU GitHub organisation; repo inside the org | Problem statement, Submission | MANUAL | None | Team lead joins the org and transfers or pushes the repo (checklist) |
| D-11 | Submission form: team name, members, project name, description, problem-solution overview, live link, repo link, demo credentials, tech stack, short documentation | Rulebook | MANUAL | `docs/SUBMISSION_CHECKLIST.md` lists every field with the source text | Fill the form |
| D-12 | Short documentation | Rulebook | DONE | `README.md`, `databasedesign.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/QA_REPORT.md` | None |

## C. Rulebook: judging criteria (what the evidence supports)

| ID | Criterion (marks) | Source | Status | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| J-01 | Problem understanding (15) | Rulebook | DONE | Scenario table in README, calendar rule matched to CU's real week | Step 6 scenarios strengthen it |
| J-02 | Innovation (20) | Rulebook | DONE | Retrieval-first chatbot with Banglish/Bangla synonyms, calendar-aware bus answers, QR check-in, tag-based instant invalidation | `pending.md` (Step 4) lists the optional AI features not built |
| J-03 | Functionality (25) | Rulebook | DONE | 4 modules end to end, 220 unit tests, Playwright suites | Full sweep in Step 2 |
| J-04 | UI/UX and accessibility (15) | Rulebook | DONE | `tests/e2e/a11y.spec.ts` (axe with colour contrast), mobile tab bar, dark mode, keyboard-operable dialogs | Re-run in Step 2 |
| J-05 | Technical implementation (15) | Rulebook | DONE | Next 16 with cache components, Prisma 7 on Neon, strict Zod, RBAC, rate limits, audit log | `databasedesign.md` (Step 3) documents the schema |
| J-06 | Presentation (10) | Rulebook | DONE | Script ready; README and docs are structured for judges | The recording itself is D-09 (MANUAL) |

## D. Rulebook: rules and constraints

| ID | Requirement | Source | Status | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| R-01 | Do not collect unnecessary personal information | Rulebook, security and privacy | DONE | Signup asks for name, email, and optionally department, batch and student ID; complaints support anonymous mode; the phone number in the profile is optional and no address is stored | None |
| R-02 | AI use is allowed; original work and no plagiarism | Rulebook | DONE | Source is the team's own; third-party libraries are listed in `package.json` | Credits section in README |
| R-03 | Secure handling of secrets | Rulebook | DONE | `.env` ignored, `.env.example` placeholders only | Secret scan in Step 7 |
| R-04 | Reasonable security (hashing, rate limiting, CSRF/origin checks) | Rulebook | DONE | bcrypt (cost 12) password hashing (`password.test.ts`), DB-backed rate limits, Turnstile, honeypot, origin checks | `SECURITY.md` in Step 7 |
| R-05 | Works on mobile | Rulebook, UI/UX | DONE | Mobile tab bar, responsive layouts, a11y suite runs at mobile width | None |

## E. Optional bonus ideas (not judging criteria)

The problem statement says AI features are optional and are not a judging criterion. They are listed here so the audit is complete, and are covered in `pending.md` (Step 4).

| ID | Idea | Source | Status | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| B-01 | AI helpdesk chatbot | Problem statement, bonus | DONE | Retrieval-first chatbot; optional LLM rephrase layer (`llm.service.ts`, `LLM_API_KEY`) | None |
| B-02 | AI semantic search | Problem statement, bonus | PARTIAL | Full-text plus fuzzy (trigram) search (`resource-search.ts`); no embeddings | Not built. Documented in `pending.md`; no marks lost |
| B-03 | AI notice summarizer (image to text) | Problem statement, bonus | MISSING | None | Not built. Documented in `pending.md`; no marks lost |
| B-04 | AI timetable conflict checker | Problem statement, bonus | MISSING | None | Not built. Documented in `pending.md`; no marks lost |
| B-05 | AI club recommendation | Problem statement, bonus | MISSING | None | Not built. Documented in `pending.md`; no marks lost |

## Summary

| Status | Count |
| --- | --- |
| DONE | 36 |
| PARTIAL | 1 (B-02: full-text and trigram search exist, embeddings do not) |
| MISSING | 3 (B-03, B-04, B-05: optional AI bonuses) |
| MANUAL | 4 (D-01, D-09, D-10, D-11) |
| **Total** | **44** |

The three MISSING items and the PARTIAL one are optional bonus ideas that carry no marks. They are recorded in `pending.md` and not implemented. MANUAL items are in `docs/SUBMISSION_CHECKLIST.md`.
