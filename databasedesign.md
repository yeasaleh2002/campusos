# CampusOS database design

This document describes the PostgreSQL schema that `prisma/schema.prisma` defines. It covers every model (31) and every enum (25), the relationships and delete rules, the search design, integrity and security rules, the scalability choices, the data lifecycle, and how migrations and seeding work. `scripts/verify-db-doc.ts` checks this file against the schema (`npm run docs:verify-db`).

- **Engine:** PostgreSQL on Neon, with the `pg_trgm` extension.
- **Access:** Prisma 7 with the `@prisma/adapter-pg` driver adapter. Runtime queries use the pooled `DATABASE_URL`. Migrations use `DIRECT_URL`.
- **Identifiers:** every primary key is a `cuid()` string, except `TicketCounter.year`, `SearchTerm.term`, `RateLimit.key` and `SiteSetting.key`, which are natural keys.
- **Time:** timestamps are stored in UTC. The campus calendar (`CampusClosure.date`, bus departure times) is expressed in Asia/Dhaka. See [Campus calendar data](#campus-calendar-data).

## Contents

1. [Domain map](#domain-map)
2. [Enums](#enums)
3. [Models](#models)
4. [Relationship and delete matrix](#relationship-and-delete-matrix)
5. [Campus calendar data](#campus-calendar-data)
6. [Search design](#search-design)
7. [Integrity rules](#integrity-rules)
8. [Security](#security)
9. [Scalability](#scalability)
10. [Data lifecycle](#data-lifecycle)
11. [Migrations and seeding](#migrations-and-seeding)

## Domain map

| Domain | Models |
| --- | --- |
| Identity | `User`, `EmailOtp` |
| Academic | `Department`, `Course` |
| Clubs and events | `Club`, `ClubMember`, `Event`, `EventRegistration`, `EventBookmark` |
| Resources | `Resource`, `ResourceBookmark` |
| Knowledge base and chatbot | `KnowledgeEntry`, `ChatSession`, `ChatMessage` |
| Transport and calendar | `BusRoute`, `BusTrip`, `CampusClosure` |
| Notices and forms | `Notice`, `FormLink` |
| Lost and found | `LostFoundItem`, `ClaimRequest` |
| Complaints | `Complaint`, `ComplaintUpdate`, `TicketCounter` |
| Platform | `Notification`, `AuditLog`, `Follow`, `SearchTerm`, `RateLimit`, `UploadedFile`, `SiteSetting` |

The ownership chain is simple: almost everything points at `User`, and the content models (`Event`, `Resource`, `Notice`, `LostFoundItem`, `Complaint`) also point at `Department`, `Club` or `Course` where that makes sense.

## Enums

| Enum | Values | Used by |
| --- | --- | --- |
| `Role` | `USER`, `MODERATOR`, `CLUB_ADMIN`, `ADMIN`, `SUPER_ADMIN` | `User.role` |
| `OtpPurpose` | `SIGNUP_VERIFY`, `PASSWORD_RESET` | `EmailOtp.purpose` |
| `ClubCategory` | `TECHNOLOGY`, `ACADEMIC`, `CULTURAL`, `SPORTS`, `ARTS`, `DEBATE`, `SOCIAL_SERVICE`, `OTHER` | `Club.category` |
| `ClubMemberRole` | `MEMBER`, `EXECUTIVE`, `ADMIN` | `ClubMember.role` |
| `EventType` | `WORKSHOP`, `CONTEST`, `SEMINAR`, `CULTURAL`, `SPORTS`, `MEETUP`, `OTHER` | `Event.type` |
| `EventStatus` | `DRAFT`, `PUBLISHED`, `CANCELLED`, `COMPLETED` | `Event.status` |
| `RegistrationStatus` | `REGISTERED`, `CHECKED_IN`, `CANCELLED` | `EventRegistration.status` |
| `ResourceType` | `NOTES`, `QUESTION_PAPER`, `LAB_MANUAL`, `NOTICE`, `OTHER` | `Resource.type` |
| `ModerationStatus` | `PENDING`, `APPROVED`, `REJECTED` | `Resource.status` |
| `KnowledgeCategory` | `BUS`, `RULES`, `EXAM`, `ADMISSION`, `GENERAL`, `FAQ` | `KnowledgeEntry.category` |
| `KnowledgeSourceType` | `MANUAL`, `NOTICE`, `BUS_ROUTE`, `EVENT`, `RESOURCE`, `IMPORT` | `KnowledgeEntry.sourceType` |
| `BusDirection` | `TO_CAMPUS`, `FROM_CAMPUS` | `BusTrip.direction` |
| `NoticeCategory` | `CLASS_CANCELLATION`, `EXAM`, `GENERAL`, `URGENT`, `FORM_DEADLINE` | `Notice.category` |
| `LostFoundType` | `LOST`, `FOUND` | `LostFoundItem.type` |
| `LostFoundCategory` | `ELECTRONICS`, `ID_CARD`, `DOCUMENTS`, `BOOKS`, `WALLET`, `KEYS`, `BAG`, `CLOTHING`, `ACCESSORIES`, `OTHER` | `LostFoundItem.category` |
| `LostFoundStatus` | `OPEN`, `CLAIMED`, `RESOLVED`, `REJECTED` | `LostFoundItem.status` |
| `ClaimStatus` | `PENDING`, `APPROVED`, `REJECTED` | `ClaimRequest.status` |
| `ComplaintCategory` | `ACADEMIC`, `ADMINISTRATIVE`, `FACILITIES`, `TRANSPORT`, `IT_SERVICES`, `FINANCE`, `HARASSMENT`, `OTHER` | `Complaint.category` |
| `ComplaintStatus` | `RECEIVED`, `IN_REVIEW`, `RESOLVED`, `REJECTED` | `Complaint.status`, `ComplaintUpdate.status` |
| `ComplaintPriority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` | `Complaint.priority` |
| `NotificationType` | `SYSTEM`, `EVENT`, `RESOURCE`, `NOTICE`, `LOST_FOUND`, `COMPLAINT`, `CLUB` | `Notification.type` |
| `ChatRole` | `USER`, `ASSISTANT`, `SYSTEM` | `ChatMessage.role` |
| `UploadKind` | `IMAGE`, `PDF` | `UploadedFile.kind` |
| `FollowTargetType` | `DEPARTMENT`, `COURSE`, `CLUB` | `Follow.targetType` |
| `ChatFeedback` | `HELPFUL`, `NOT_HELPFUL` | `ChatMessage.feedback` |

## Models

For every model: the purpose, the columns that carry meaning (plain ones such as `createdAt` and `updatedAt` are omitted), the relations, and the indexes. "Soft delete" means the row has a `deletedAt` column and queries filter on `deletedAt IS NULL`.

### User

An account. Students, moderators, club admins, admins and super admins all live here and are told apart by `role`.

- **Columns:** `email` (unique, always lower-cased), `passwordHash` (bcrypt, cost 12), `role`, `studentId` (optional, unique), `departmentId`, `batch`, `phone` (optional), `avatarUrl`, `isEmailVerified`, `emailVerifiedAt`, `isActive`, `tokenVersion`, `failedLoginCount` and `lockedUntil` (reserved, currently unused), `lastLoginAt`.
- **Relations:** optional `Department` (set null on delete); parent of nearly every other model.
- **Indexes:** `role`, `departmentId`, `createdAt`; trigram GIN indexes on `name`, `email` and `studentId` (partial, `deletedAt IS NULL`) for the admin user search.
- **Soft delete:** yes. **Notes:** bumping `tokenVersion` invalidates every session token issued to that user.

### EmailOtp

A one-time code for email verification or password reset.

- **Columns:** `userId`, `purpose`, `codeHash` (the plain code is never stored), `expiresAt`, `attempts`, `consumedAt`.
- **Relations:** `User` (cascade). **Indexes:** `(userId, purpose)`, `expiresAt`.
- **Lifecycle:** expired rows are removed by the maintenance cron.

### Department

A university department (CSE, BBA, and so on).

- **Columns:** `name` (unique), `code` (unique), `faculty`.
- **Relations:** has many `User`, `Course`, `Resource`, `Notice`.

### Course

A course in a department's catalogue.

- **Columns:** `code`, `title`, `departmentId`, `semester`, `credits`.
- **Relations:** `Department` (restrict). **Uniques:** `(departmentId, code)`. **Indexes:** `(departmentId, semester)`.

### Club

A student club.

- **Columns:** `name` (unique), `slug` (unique), `description`, `logoUrl`, `coverUrl`, `category`, `isActive`, `memberCount` (denormalized counter kept by the club service).
- **Relations:** has many `ClubMember`, `Event`, `FormLink`. **Indexes:** `(isActive, category)`. **Soft delete:** yes.

### ClubMember

A user's membership in a club. A club admin is a `ClubMember` with `role = ADMIN`.

- **Columns:** `userId`, `clubId`, `role`, `joinedAt`.
- **Relations:** `User` (cascade), `Club` (cascade). **Uniques:** `(userId, clubId)`. **Indexes:** `(clubId, role)`.

### Event

A club event.

- **Columns:** `title`, `slug` (unique), `description`, `clubId`, `type`, `startAt`, `endAt`, `venue`, `bannerUrl`, `capacity` (null means unlimited), `registrationDeadline`, `status`, `registrationCount` (counter of active registrations), `reminderSentAt` (makes the reminder cron idempotent), `createdById`.
- **Relations:** `Club` (restrict), `User` creator (restrict). **Indexes:** `(status, startAt)`, `clubId`, `type`; trigram GIN indexes on `title` and `venue`. **Soft delete:** yes.
- **Calendar rule:** an event starting on a weekly off day needs an explicit confirmation in the API (`confirmOffDay`). This is an application rule; the database does not block it.

### EventRegistration

A student's seat at an event, with the QR ticket.

- **Columns:** `eventId`, `userId`, `qrToken` (unique, random, up to 64 characters), `status`, `checkedInAt`, `checkedInById`.
- **Relations:** `Event` (cascade), `User` (cascade), check-in staff `User` (set null). **Uniques:** `(eventId, userId)`, `qrToken`. **Indexes:** `(eventId, status)`, `(userId, createdAt)`.

### EventBookmark

A user's saved event.

- **Relations:** `User` (cascade), `Event` (cascade). **Uniques:** `(userId, eventId)`. **Indexes:** `(userId, createdAt)`.

### Resource

An uploaded PDF (notes, question paper, lab manual) that goes through moderation.

- **Columns:** `title`, `description`, `type`, `courseId`, `courseName` (free text when the course is not in the catalogue; the API rejects a request that sets both), `departmentId`, `semester`, `year`, `fileUrl`, `fileKey` (unique), `fileSize`, `mimeType`, `uploadedById`, `status`, `reviewedById`, `reviewedAt`, `rejectionReason`, `downloadCount`, `bookmarkCount`, `isSample`, `tags`, `searchVector` (generated column).
- **Relations:** `Department` (restrict), `Course` (set null), uploader `User` (restrict), reviewer `User` (set null).
- **Indexes:** `(status, departmentId, type, semester, createdAt)`, `(courseId, status)`, `(uploadedById, createdAt)`, GIN on `tags`, GIN on `searchVector`, trigram GIN `Resource_title_trgm_idx` on `title`.
- **Soft delete:** yes.

### ResourceBookmark

A user's saved resource.

- **Relations:** `User` (cascade), `Resource` (cascade). **Uniques:** `(userId, resourceId)`. **Indexes:** `(userId, createdAt)`, `resourceId`.

### KnowledgeEntry

A question and answer in the helpdesk knowledge base. Some entries are generated from notices and bus routes.

- **Columns:** `category`, `question`, `answer`, `keywords`, `sourceType`, `sourceRefId`, `isPublished`, `isSample`, `viewCount`, `createdById`, `searchVector` (generated column).
- **Relations:** creator `User` (set null). **Indexes:** `(isPublished, category)`, `(sourceType, sourceRefId)`, GIN on `keywords`, GIN on `searchVector`, trigram GIN `KnowledgeEntry_question_trgm_idx` on `question`.
- **Soft delete:** yes.

### ChatSession

A chatbot conversation, anonymous or signed in.

- **Columns:** `token` (unique, unguessable id the browser holds), `userId`, `messageCount`, `lastMessageAt`.
- **Relations:** `User` (set null). **Indexes:** `(userId, lastMessageAt)`.

### ChatMessage

One message in a session.

- **Columns:** `sessionId`, `userId`, `role`, `content`, `matchedEntryIds`, `confidence` (0 to 1), `isAnswered` (false feeds the admin "unanswered questions" inbox), `intent` (for example `NEXT_BUS`), `feedback`, `feedbackAt`.
- **Relations:** `ChatSession` (cascade), `User` (set null). **Indexes:** `(sessionId, createdAt)`, `(isAnswered, createdAt)`, `(feedback, createdAt)`.

### BusRoute

A bus route to the Khagan/Birulia campus.

- **Columns:** `name`, `code` (unique), `stops` (JSON array of `{ name, offsetMinutes, lat?, lng? }`, validated by Zod before it is stored), `notes`, `isActive`.
- **Relations:** has many `BusTrip`. **Indexes:** `isActive`. **Soft delete:** yes.

### BusTrip

One scheduled departure of a route.

- **Columns:** `routeId`, `departureTime` (`HH:mm`, Asia/Dhaka), `direction`, `daysOfWeek` (integers, 0 = Sunday to 6 = Saturday), `isActive`.
- **Relations:** `BusRoute` (cascade). **Indexes:** `(routeId, isActive)`, `(direction, departureTime)`.
- **Constraint:** `BusTrip_no_off_days` rejects any trip whose `daysOfWeek` contains 3 (Wednesday) or 4 (Thursday).

### CampusClosure

A special closure on one Dhaka calendar date, such as a public holiday or an exam-day bus change. It overrides the weekly rule.

- **Columns:** `date` (`DATE`, unique, no time part), `title`, `closesCampus`, `suspendsBus`, `note`, `createdById`.
- **Relations:** creator `User` (restrict). **Indexes:** unique `date`, `(date, closesCampus, suspendsBus)`.
- **Rule:** a closure should close the campus, suspend the bus, or both. The API enforces this; one date holds at most one closure.

### Notice

A campus notice, optionally aimed at a department or course.

- **Columns:** `title`, `body`, `category`, `departmentId`, `courseId`, `pinned`, `expiresAt`, `attachmentUrl`, `createdById`.
- **Relations:** `Department` (set null), `Course` (set null), creator `User` (restrict). **Indexes:** `(pinned, createdAt)`, `(category, createdAt)`, `(departmentId, createdAt)`, `expiresAt`; trigram GIN on `title` and `body`.
- **Soft delete:** yes.

### FormLink

A central listing entry for an external form (Google Forms and similar).

- **Columns:** `title`, `description`, `url`, `deadline`, `clubId`, `isOpen`, `createdById`.
- **Relations:** `Club` (set null), creator `User` (restrict). **Indexes:** `(isOpen, deadline)`, `clubId`. **Soft delete:** yes.

### LostFoundItem

A lost or found post.

- **Columns:** `type`, `title`, `description`, `category`, `locationText`, `occurredAt`, `imageUrls`, `status`, `contactVisible`, `reporterId`, `resolvedById`, `resolvedAt`.
- **Relations:** reporter `User` (restrict), resolver `User` (set null), has many `ClaimRequest`. **Indexes:** `(status, type, createdAt)`, `(category, status)`, `(reporterId, createdAt)`; trigram GIN on `title`, `description` and `locationText`.
- **Soft delete:** yes.

### ClaimRequest

A student's claim on a lost and found post. An admin or the reporter approves or rejects it.

- **Columns:** `itemId`, `claimerId`, `message`, `status`, `reviewedById`, `reviewedAt`.
- **Relations:** `LostFoundItem` (cascade), claimer `User` (cascade), reviewer `User` (set null). **Uniques:** `(itemId, claimerId)`. **Indexes:** `(itemId, status)`, `(claimerId, createdAt)`.

### Complaint

A ticketed complaint.

- **Columns:** `ticketNo` (unique, like `CU-2026-000123`), `category`, `subject`, `description`, `attachmentUrls`, `isAnonymous`, `status`, `priority`, `userId`, `assignedToId`, `resolvedAt`.
- **Relations:** reporter `User` (restrict), assignee `User` (set null), has many `ComplaintUpdate`. **Indexes:** `(status, priority, createdAt)`, `(userId, createdAt)`, `(assignedToId, status)`.
- **Anonymity:** `isAnonymous` hides the reporter from staff views. `userId` stays so the reporter can track the ticket.

### ComplaintUpdate

An entry in a complaint's timeline.

- **Columns:** `complaintId`, `status`, `note`, `isInternal` (staff only), `byUserId`.
- **Relations:** `Complaint` (cascade), author `User` (restrict). **Indexes:** `(complaintId, createdAt)`.

### TicketCounter

One row per year, used to allocate complaint ticket numbers.

- **Columns:** `year` (primary key), `lastValue`.
- **Use:** one atomic `INSERT ... ON CONFLICT DO UPDATE` increments `lastValue`, so two complaints never get the same number.

### Notification

An in-app notification.

- **Columns:** `userId`, `type`, `title`, `body`, `link`, `readAt`.
- **Relations:** `User` (cascade). **Indexes:** `(userId, readAt, createdAt)`.

### AuditLog

An append-only record of staff and security actions.

- **Columns:** `actorId`, `action` (for example `calendar.closure_create`), `entityType`, `entityId`, `metadata` (JSON), `ip`.
- **Relations:** actor `User` (set null, so history survives account removal). **Indexes:** `(entityType, entityId)`, `(actorId, createdAt)`, `(action, createdAt)`.

### Follow

A user following a department, course or club. It drives notice fan-out.

- **Columns:** `userId`, `targetType`, `targetId` (a plain id; it is not a foreign key because it can point at three tables).
- **Relations:** `User` (cascade). **Uniques:** `(userId, targetType, targetId)`. **Indexes:** `(targetType, targetId)`.

### SearchTerm

Aggregated global-search terms for analytics.

- **Columns:** `term` (primary key, normalised), `count`, `lastSearchedAt`. **Indexes:** `count`.

### RateLimit

Fixed-window counters for the database-backed rate limiter.

- **Columns:** `key` (primary key, for example a route plus IP), `count`, `resetAt`. **Indexes:** `resetAt`.
- **Lifecycle:** the maintenance cron deletes windows older than one hour.

### UploadedFile

Every uploaded object, so orphans can be found and removed.

- **Columns:** `key` (unique), `url`, `name`, `size`, `mimeType`, `kind`, `uploadedById`.
- **Relations:** uploader `User` (set null). **Indexes:** `(uploadedById, createdAt)`, `(kind, createdAt)`.

### SiteSetting

Site-wide configuration. One row with `key = "site"` holds the banner message and the maintenance switch.

- **Columns:** `key` (primary key), `value` (JSON), `updatedById`.

## Relationship and delete matrix

Every foreign key in the schema, with the rule that applies when the parent row is deleted.

| Child | Column | Parent | Optional | On delete |
| --- | --- | --- | --- | --- |
| User | departmentId | Department | yes | SetNull |
| EmailOtp | userId | User | no | Cascade |
| Course | departmentId | Department | no | Restrict |
| ClubMember | userId | User | no | Cascade |
| ClubMember | clubId | Club | no | Cascade |
| Event | clubId | Club | no | Restrict |
| Event | createdById | User | no | Restrict |
| EventRegistration | eventId | Event | no | Cascade |
| EventRegistration | userId | User | no | Cascade |
| EventRegistration | checkedInById | User | yes | SetNull |
| EventBookmark | userId | User | no | Cascade |
| EventBookmark | eventId | Event | no | Cascade |
| Resource | departmentId | Department | no | Restrict |
| Resource | courseId | Course | yes | SetNull |
| Resource | uploadedById | User | no | Restrict |
| Resource | reviewedById | User | yes | SetNull |
| ResourceBookmark | userId | User | no | Cascade |
| ResourceBookmark | resourceId | Resource | no | Cascade |
| KnowledgeEntry | createdById | User | yes | SetNull |
| ChatSession | userId | User | yes | SetNull |
| ChatMessage | sessionId | ChatSession | no | Cascade |
| ChatMessage | userId | User | yes | SetNull |
| BusTrip | routeId | BusRoute | no | Cascade |
| CampusClosure | createdById | User | no | Restrict |
| Notice | departmentId | Department | yes | SetNull |
| Notice | courseId | Course | yes | SetNull |
| Notice | createdById | User | no | Restrict |
| FormLink | clubId | Club | yes | SetNull |
| FormLink | createdById | User | no | Restrict |
| LostFoundItem | reporterId | User | no | Restrict |
| LostFoundItem | resolvedById | User | yes | SetNull |
| ClaimRequest | itemId | LostFoundItem | no | Cascade |
| ClaimRequest | claimerId | User | no | Cascade |
| ClaimRequest | reviewedById | User | yes | SetNull |
| Complaint | userId | User | no | Restrict |
| Complaint | assignedToId | User | yes | SetNull |
| ComplaintUpdate | complaintId | Complaint | no | Cascade |
| ComplaintUpdate | byUserId | User | no | Restrict |
| Notification | userId | User | no | Cascade |
| AuditLog | actorId | User | yes | SetNull |
| Follow | userId | User | no | Cascade |
| UploadedFile | uploadedById | User | yes | SetNull |

How to read the rules:

- **Cascade** is used for data that has no meaning without its parent (OTP codes, registrations, bookmarks, chat messages, notifications, claims, complaint updates, bus trips).
- **Restrict** protects content that other people depend on. A user who created events, resources, notices, closures, complaints or lost and found posts cannot be hard-deleted. In practice accounts are deactivated (`isActive = false`) or soft-deleted, so history stays intact.
- **SetNull** keeps the row but drops the link (for example, the reviewer of a resource or the actor of an audit entry).

Tables that are not linked by a foreign key on purpose: `Follow.targetId` (three possible targets), `KnowledgeEntry.sourceRefId` (a notice, bus route, event or resource id), `AuditLog.entityId`, `TicketCounter`, `SearchTerm`, `RateLimit`, `SiteSetting`.

## Campus calendar data

The campus week is a product rule, and the database stores only the parts that need storing.

- The weekly rule (open Friday to Tuesday, closed Wednesday and Thursday, no bus on Wednesday and Thursday) lives in code (`src/config/campus-calendar.ts`). It is not a table, so there is nothing to keep in sync.
- `BusTrip.daysOfWeek` uses JavaScript weekday numbers (0 = Sunday). The constraint `BusTrip_no_off_days` (`CHECK (NOT ("daysOfWeek" && ARRAY[3, 4]))`) keeps Wednesday and Thursday out even if a script bypasses the service layer.
- `CampusClosure` stores the exceptions: public holidays, exam-day bus changes. `date` is a `DATE`, so it has no time zone to misread.
- The `20261013000000_campus_calendar` migration also rewrites existing trips once: it removes days 3 and 4, adds Friday (5), de-duplicates and sorts. Running it again changes nothing.
- Every "today" or "tomorrow" decision computes the weekday in Asia/Dhaka, never from the server's UTC day.

## Search design

CampusOS uses three PostgreSQL features, all indexed, and no external search service.

| Need | Technique | Where |
| --- | --- | --- |
| Ranked search over resources and the knowledge base | Stored generated `tsvector` columns with a GIN index. Resources weight `title` and `tags` as A and `description` as B. The knowledge base weights `question` and `keywords` as A and `answer` as B. | `Resource.searchVector`, `KnowledgeEntry.searchVector` (migration `20261007000100_fulltext_search`) |
| Typos ("algoritm" finds "Algorithms") | `pg_trgm` `word_similarity()` against the title, served by trigram GIN indexes | `Resource_title_trgm_idx`, `KnowledgeEntry_question_trgm_idx` |
| Substring search (`ILIKE '%term%'`) in global search and the admin user list | Partial trigram GIN indexes (`WHERE "deletedAt" IS NULL`) | Event, Notice, LostFoundItem and User indexes (migration `20261011000000_trigram_search_indexes`) |
| Tag filters | GIN index on the `tags` and `keywords` arrays | `Resource.tags`, `KnowledgeEntry.keywords` |

Ranking for resources: a strict `websearch_to_tsquery` match counts double, then any-term matches, then title similarity, then a course hit. User text always goes through `plainto_tsquery` or `websearch_to_tsquery`, which never parse operators, and through bound query parameters.

The chatbot is retrieval first: it ranks knowledge-base entries with the same full-text and trigram indexes and adds Banglish and Bangla synonym expansion in code. Deterministic intents (next bus, campus open or closed, class cancellations) read live data instead. An optional LLM only rephrases an entry that retrieval already chose.

Generated columns are written by Postgres, so they never go out of date. Prisma sees them as `Unsupported("tsvector")` with a `dbgenerated()` default, and the application never writes them.

## Integrity rules

| Rule | Mechanism |
| --- | --- |
| One account per email, student ID, department code | Unique indexes (`User.email`, `User.studentId`, `Department.code`) |
| One registration per student and event; one claim per student and post; one bookmark per student and item; one follow per target | Composite unique indexes |
| No overbooking | `registrationCount` is incremented with a conditional `UPDATE ... WHERE capacity IS NULL OR registrationCount < capacity` inside a transaction. Postgres runs it under a row lock, so two students cannot take the last seat. |
| Unique complaint ticket numbers | `TicketCounter` upsert in a single statement |
| No bus trip on a weekly off day | `BusTrip_no_off_days` CHECK constraint plus the `BUS_DAY_NOT_ALLOWED` check in the service |
| One closure per date | Unique index on `CampusClosure.date` (the API answers 409) |
| A resource has a listed course or a typed one, not both | Zod refinement in the API (`createResourceSchema`) |
| QR tickets cannot be guessed | `EventRegistration.qrToken` is random and unique |
| Counters stay correct | `Club.memberCount`, `Event.registrationCount`, `Resource.downloadCount` and `bookmarkCount` change in the same transaction as the row that causes them |
| Soft-deleted rows disappear from reads | Every query on a soft-delete model filters `deletedAt IS NULL` (the partial trigram indexes do the same) |
| Validated input only | Zod `.strict()` schemas on every route reject unknown fields before the database is touched |

## Security

- **Passwords** are hashed with bcrypt (cost 12). **OTP codes** are stored as hashes, with an attempt counter and an expiry. Sign-in lockout (5 failures in 15 minutes locks that email and IP for 15 minutes) is counted in `RateLimit` rows, not on the user row; the columns `User.failedLoginCount` and `User.lockedUntil` exist in the schema but the application does not use them yet.
- **Sessions** are signed JWTs in an HTTP-only cookie. `User.tokenVersion` lets the server revoke every token of a user at once.
- **Least data:** a student gives a name and email. Department, batch, student ID and phone are optional. Complaints can be anonymous.
- **No raw SQL string building:** raw queries use Prisma's tagged templates, so values are bound parameters.
- **Private data is not cached publicly:** notifications, registrations, bookmarks, complaints and chat sessions are read per user and never stored in the shared cache.
- **Audit:** admin mutations write to `AuditLog`.
- **Secrets** (connection strings, API keys) live only in environment variables. The schema contains none.
- **Uploads** are accepted only from the UploadThing host; `UploadedFile` tracks them so orphans can be cleaned.

## Scalability

- Hot list queries have composite indexes that match their filter and sort, for example events by `(status, startAt)` and resources by `(status, departmentId, type, semester, createdAt)`.
- Lists use cursor pagination, not offsets, so deep pages cost the same as the first page.
- Counters are denormalized so a list never runs `COUNT(*)` over registrations or bookmarks.
- Search is index-backed (GIN on tsvector, arrays and trigrams). Without the trigram indexes, `ILIKE '%term%'` would scan the whole table.
- Public reads go through a tag-invalidated cache, so most page views never reach the database. A write expires only the tags it affects.
- Neon provides pooling for runtime queries; migrations use the direct connection.
- Housekeeping tables (`RateLimit`, `EmailOtp`) are trimmed by a daily cron, and `scripts/explain-queries.ts` (`npm run db:explain`) prints query plans for the main reads.

## Data lifecycle

| Data | Created | Changes | Removed |
| --- | --- | --- | --- |
| User | Signup (unverified) | Email verified, profile edits, role change, deactivation | Soft delete; hard delete is blocked by restrict rules |
| EmailOtp | Signup, password reset | `attempts` and `consumedAt` | Maintenance cron, 24 hours after expiry |
| Event | Draft by a club admin or admin | Publish, edit, cancel, complete | Soft delete |
| EventRegistration | Student registers | Check-in at the door, or cancellation | Cascades with the event or user |
| Resource | Student uploads (`PENDING`) | Moderator approves or rejects; counters grow | Soft delete; the file is cleaned up if it becomes an orphan |
| KnowledgeEntry | Admin, import, or auto-sync from notices and bus routes | Edits, publish toggle | Soft delete; a synced entry is removed when its source is |
| BusRoute, BusTrip | Admin (or seed) | Edits | Soft delete for the route; trips cascade with the route |
| CampusClosure | Admin | Edit | Hard delete by an admin |
| LostFoundItem | Student posts | Claims, status changes | Soft delete |
| Complaint | Student files, ticket number allocated | Staff updates the status and adds timeline notes | Kept for the record |
| Notification | System events | Marked read | Cascades with the user |
| AuditLog | Admin actions | Append only | Kept; the actor link is set to null if the account is removed |
| RateLimit | First request in a window | `count` grows | Maintenance cron, after one hour |

## Migrations and seeding

Migrations are SQL files under `prisma/migrations`, applied in order by `prisma migrate deploy`.

| Migration | What it does |
| --- | --- |
| `20261007000000_init` | Enables `pg_trgm`, creates the enums, tables, keys and indexes |
| `20261007000100_fulltext_search` | Rebuilds `searchVector` as a stored generated column on `Resource` and `KnowledgeEntry`, with the immutable array-join helper |
| `20261008000000_event_bookmarks_sample_resources` | Adds `EventBookmark` and `Resource.isSample` |
| `20261009000000_helpdesk_follow_search` | Adds `Follow`, `SearchTerm`, chat feedback and tokens, the event reminder marker and `KnowledgeEntry.isSample` |
| `20261010000000_site_settings` | Adds `SiteSetting` |
| `20261011000000_trigram_search_indexes` | Adds the partial trigram indexes for substring search |
| `20261012000000_resource_course_name` | Adds `Resource.courseName` |
| `20261013000000_campus_calendar` | Adds `CampusClosure`, rewrites existing bus trips to Friday to Tuesday, adds the `BusTrip_no_off_days` constraint |

- **Apply:** `npm run db:deploy` (runs `scripts/migrate-deploy.mjs` against `DIRECT_URL`). The Vercel build does not migrate; run it once from your machine before or after a deploy that changes the schema.
- **Develop:** `npm run db:migrate` creates a migration from schema changes. Raw SQL parts (generated columns, trigram indexes, CHECK constraints) are added by hand to the migration file.
- **Seed:** `npm run db:seed` runs `prisma/seed.ts`, which calls `seed-campus.ts` and `seed-content.ts`. It is idempotent: it upserts, and it never overwrites an existing password. It creates:
  - staff and demo student accounts from environment variables (`ADMIN1_EMAIL` to `ADMIN4_EMAIL`, `DEMO_USER_EMAIL`, with their passwords),
  - 9 departments, 56 courses and 12 clubs,
  - 30 events dated relative to the seed day and never on Wednesday or Thursday,
  - 60 sample resources, 95 sample FAQ entries (plus generated bus-route and notice entries), 6 bus routes with Friday to Tuesday trips, 8 notices, 5 forms, 6 lost and found posts,
  - one sample closure (Victory Day, 16 December 2026).
- **Fresh database:** create an empty database, set `DATABASE_URL` and `DIRECT_URL`, run `npm run db:deploy`, then `npm run db:seed`.
