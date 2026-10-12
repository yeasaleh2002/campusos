# Submission checklist (manual steps)

Everything in this list needs a person. The code cannot do it. Tick each box before the deadline. Demo passwords never go in the repository: they go only into the submission form.

## 1. Deploy and smoke-test

- [ ] Review the working tree and commit it yourself (the AI assistant never commits or pushes).
- [ ] In Brevo, open **Security → Authorised IPs** and deactivate IP blocking, otherwise Vercel's changing IPs cannot send OTP emails.
- [ ] Confirm every variable from `.env.example` is set in the Vercel project (Settings → Environment Variables). Use the real Turnstile keys, or the dummy test keys if you accept that bots are not blocked.
- [ ] Redeploy to production and open the live URL (`https://campusos-tawny.vercel.app`).
- [ ] Apply database migrations once from your machine: `npm run db:deploy` (the Vercel build no longer runs migrations).
- [ ] Run `npm run db:seed` once against the production database so judges see demo data.
- [ ] Smoke test on the live URL: sign up with a fresh email and receive the OTP, log in, log out, reset a password, open the `/admin/login` page with an admin account, open `/bus` and check the campus-calendar banner.

## 2. Team and repository

- [ ] Every team member joins the CPCCU GitHub organisation.
- [ ] The repository lives inside the organisation (transfer it or push a copy there).
- [ ] Repository visibility lets the judges open it.
- [ ] `.env` is not tracked (`git ls-files .env` prints nothing) and no secret appears in the history.

## 3. Demo video

- [ ] Follow `demovideoscript.md` (Bangla; 21 segments; 10–12 minutes, with a 5-minute cut marked).
- [ ] Cover Problem, Solution, Demo, Features, Technical Implementation.
- [ ] Do the pre-recording checklist in the script (seeded data, test accounts, browser zoom, no secrets on screen).
- [ ] Upload to Google Drive and set sharing to **Anyone with the link can view**. Open the link in a private window to confirm it plays.

## 4. Submission form fields

| Field | Where the text comes from |
| --- | --- |
| Team name | Nurix Hive |
| Members | Fill in names and roles |
| Project name | CampusOS: a unified campus hub for City University |
| Description | README "Overview" |
| Problem-solution overview | README "Problem → solution scenarios" and "Real-world usability" |
| Live link | `https://campusos-tawny.vercel.app` (confirm the final URL) |
| Source code / repo link | The repository URL inside the CPCCU organisation |
| Demo credentials | Type the seeded accounts by role from your own `.env` values (`ADMIN1_EMAIL`, `DEMO_USER_EMAIL` and their passwords). Do not paste them anywhere else. |
| Tech stack | README "Tech stack" |
| Short documentation | README plus `docs/` and `databasedesign.md` |
| Other info | `docs/QA_REPORT.md`, `SECURITY.md`, `pending.md` (what is not built and why) |

## 5. Last checks

- [ ] `npm run lint`, `npm run typecheck`, `npm run build` and `npm test` pass on the final commit.
- [ ] The live site works on a phone (open `/`, `/bus`, `/events`, sign in).
- [ ] Open the Drive link and the repo link from a logged-out browser.
