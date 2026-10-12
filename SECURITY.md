# Security policy

CampusOS handles student accounts, uploaded documents and complaints, so we treat security reports seriously.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

1. Use GitHub's private reporting: open the **Security** tab of this repository and choose **Report a vulnerability**.
2. If that is not available to you, contact the team lead (Nurix Hive) through the contact details in the hackathon submission and ask for a private channel.
3. Include the affected URL or file, the steps to reproduce, and what an attacker could do. Do not include real student data.

We aim to acknowledge a report within 3 working days and to fix confirmed high-severity issues first. Please give us a reasonable time to fix a problem before you publish details.

## Scope

In scope: the CampusOS web app and its `/api/*` endpoints, the admin console, the upload flow, and the database schema in this repository.

Out of scope: denial-of-service and volume testing against the live site, social engineering, attacks on third-party services (Vercel, Neon, Brevo, UploadThing, Cloudflare), and findings that need a rooted device or a stolen session cookie.

## What is already in place

The details and the evidence are in the [Security](README.md#security) and [Production hardening](README.md#production-hardening) sections of the README. In short:

- **Passwords and codes:** bcrypt (cost 12); email OTP codes are stored only as hashes, with an expiry and an attempt limit.
- **Sessions:** a signed JWT in an `httpOnly`, `SameSite=Lax` cookie (`Secure` in production). A per-user `tokenVersion` revokes sessions on role change, deactivation and password change.
- **Access control:** a permission matrix (`src/lib/auth/rbac.ts`) checked in `proxy.ts` and again in every admin handler. Club admins are limited to their own clubs.
- **Input:** Zod `.strict()` validation on every endpoint, parameterised database queries only, and an `Origin` check on every mutating request.
- **Abuse limits:** database-backed rate limits, a login lockout (5 failures in 15 minutes), a honeypot field, and optional Cloudflare Turnstile on public forms.
- **Uploads:** magic-byte and size checks, images re-encoded, and stored URLs accepted only if they point at a tracked UploadThing file the caller owns.
- **Headers:** CSP, HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy` and `Permissions-Policy` from `next.config.ts`.
- **Privacy:** signup needs only a name, email and password. Complaints can hide the reporter's identity from staff. Contact details on lost and found posts stay private until a claim is approved.
- **Audit:** every admin mutation writes an audit log entry (actor, entity, IP).

## Handling secrets

- Secrets live only in environment variables (see [`.env.example`](.env.example) for the names; it holds placeholders only).
- `.env` and every `.env.*` file except `.env.example` are git-ignored.
- Demo passwords are given to the judges through the submission form, never in the repository.
- If you think a secret leaked, rotate it first (Neon password, `JWT_SECRET`, Brevo key, UploadThing token, cron and revalidate secrets), then tell us.

## Known limitations

- `script-src` keeps `'unsafe-inline'` because Next.js injects inline bootstrap scripts. Moving to nonces would make every page dynamic and defeat the tag-based cache, so this is a conscious trade-off.
- `npm audit` can report advisories in development-only tooling (the ESLint chain). They do not ship to production; production dependencies are checked with `npm run audit:prod`.
- Unknown dynamic pages answer with HTTP 200 and the not-found screen (marked `noindex`) instead of HTTP 404, because of how Cache Components streams the page.
- Brevo email delivery depends on the account's IP authorisation settings; if "Authorised IPs" blocking is on, OTP emails fail from Vercel.
