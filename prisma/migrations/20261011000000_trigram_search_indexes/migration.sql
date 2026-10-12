-- Trigram (pg_trgm) GIN indexes for the case-insensitive substring searches (ILIKE '%term%')
-- used by global search and the admin user search. B-tree indexes cannot serve a leading
-- wildcard, so without these every search is a sequential scan once tables hold millions of rows.
-- Partial predicates mirror the queries (soft-deleted rows are never searched).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Event_title_trgm_idx" ON "Event" USING gin ("title" gin_trgm_ops) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Event_venue_trgm_idx" ON "Event" USING gin ("venue" gin_trgm_ops) WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "Notice_title_trgm_idx" ON "Notice" USING gin ("title" gin_trgm_ops) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "Notice_body_trgm_idx" ON "Notice" USING gin ("body" gin_trgm_ops) WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "LostFoundItem_title_trgm_idx" ON "LostFoundItem" USING gin ("title" gin_trgm_ops) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "LostFoundItem_description_trgm_idx" ON "LostFoundItem" USING gin ("description" gin_trgm_ops) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "LostFoundItem_location_trgm_idx" ON "LostFoundItem" USING gin ("locationText" gin_trgm_ops) WHERE "deletedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "User_name_trgm_idx" ON "User" USING gin ("name" gin_trgm_ops) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "User_email_trgm_idx" ON "User" USING gin ("email" gin_trgm_ops) WHERE "deletedAt" IS NULL;
CREATE INDEX IF NOT EXISTS "User_studentId_trgm_idx" ON "User" USING gin ("studentId" gin_trgm_ops) WHERE "deletedAt" IS NULL;
