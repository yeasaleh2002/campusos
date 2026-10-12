# GLOBAL RULES (paste at the start of every prompt)

```
GLOBAL RULES (apply to every task, never skip):
- Project: "CampusOS", a unified campus hub for City University (Bangladesh). Repo/package name: campusos-city-university.
- Stack: Next.js (latest stable, App Router, TypeScript strict), Node.js runtime for APIs inside the same Next.js project (Route Handlers under /app/api), PostgreSQL on Neon, Prisma ORM, Zod validation, Tailwind CSS, Framer Motion, react-hot-toast (or sonner) for toasts.
- Environment: a real `.env` file already exists in the project root with ALL required variables (DATABASE_URL, DIRECT_URL, JWT_SECRET, JWT_EXPIRES_IN, BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME, UPLOADTHING_TOKEN, REVALIDATE_SECRET, CRON_SECRET, ADMIN1..4_EMAIL/PASSWORD, DEMO_USER_EMAIL/PASSWORD, optional LLM_API_KEY, TURNSTILE_SECRET_KEY, NEXT_PUBLIC_*). Use these exact variable names. Do NOT overwrite, print, log, or copy the values anywhere. Prisma CLI and Next.js both read `.env`.
- NEVER hardcode secrets. All secrets only via process.env, validated at startup with a Zod env schema (src/lib/env.ts). Maintain .env.example with empty placeholders. .env* is in .gitignore (already provided; keep `!.env.example`). Never commit secrets; never expose them to the client bundle (only NEXT_PUBLIC_* may be client-side and must contain no secrets).
- Email: Brevo REST API (https://api.brevo.com/v3/smtp/email) via native fetch with BREVO_API_KEY, sender from BREVO_SENDER_EMAIL / BREVO_SENDER_NAME.
- Auth: JWT (jose, HS256) using JWT_SECRET and JWT_EXPIRES_IN, in httpOnly+Secure+SameSite=Lax cookie.
- Campus calendar rule: City University is OPEN Friday, Saturday, Sunday, Monday, Tuesday. It is CLOSED (weekly off days) on Wednesday and Thursday, and there is NO bus service on those days. All "today/tomorrow/this week/next bus" logic must use the single source of truth in src/config/campus-calendar.ts and compute the weekday in the Asia/Dhaka timezone (never server UTC or the browser's local time).
- Uploads: images go through the npm package `image-video-compressor` (server-side compress) then UploadThing (UTApi, UPLOADTHING_TOKEN), and the returned URL is saved in the database. PDFs use the UploadThing FileRouter with auth middleware.
- Every internal navigation must use next/link <Link> (no <a href> for internal routes, no window.location) so there are no full page reloads.
- Public read pages use tag-based ISR ONLY (no time-based `revalidate: N`). Use cached data fetchers (unstable_cache / the installed Next.js version's caching API, check its docs) with explicit tags, and call revalidateTag in EVERY admin/user mutation (create/update/delete/status change/upload). Tag map lives in src/lib/cache-tags.ts and is documented in README.
- Reusable components first; no duplicated UI. Premium, consistent design system. Responsive for mobile, tablet, HD, Full HD, 2K and 4K. Framer Motion for animation (LazyMotion to keep bundle small). Use toasts properly on every mutation.
- Every API returns a consistent envelope: { success: boolean, data?: T, error?: { code: string, message: string, details?: any }, meta?: { page, limit, nextCursor, total } }.
- Every API endpoint must be documented in README.md under "API Reference" with: method, path, auth requirement, request headers, request payload body (JSON example), success response (JSON example), error responses, and status codes. Update README.md in the SAME task that adds/changes an endpoint (never leave docs for later).
- Scalability target 1M+ users: cursor pagination on all lists, proper DB indexes (compound where needed), no N+1 queries (use Prisma select/include carefully), select only needed fields, Prisma client singleton, keep serverless-friendly, counters denormalized where hot.
- Performance: aim for public pages to load in ~0.4s from ISR/CDN cache: next/font, next/image, lazy loading, dynamic imports below the fold, minimal first-load JS. Report measured numbers honestly.
- Security: bcrypt (cost 12), input validation with Zod (.strict()) on every endpoint, output never leaks password hashes/OTP/internal fields, rate limiting, Origin check for mutating requests, honeypot + bot protection, security headers + CSP in next.config, file type (magic bytes)/size validation, XSS-safe rendering (no dangerouslySetInnerHTML with user content), generic error messages (no stack traces), audit logging for admin actions.
- Code quality: small functions, service layer (src/server/services/*), repositories where useful, typed everything, no `any`, meaningful names, JSDoc on service functions, no dead code, no console.log in production code.
- After finishing the task: run `npm run lint`, `npx tsc --noEmit`, and `npm run build`, fix ALL errors/warnings, and list what you verified. Do not say "done" if anything fails.
```

## Notes
- Put `.env`, `.gitignore`, and this file in the project root before running Prompt 1.
- Hackathon er por: Neon password, Brevo key, UploadThing token, JWT secret, admin passwords sob rotate koro.
- `DIRECT_URL` ami pooled URL theke `-pooler` bad diye banaisi. Neon dashboard theke ekbar mila nio.
