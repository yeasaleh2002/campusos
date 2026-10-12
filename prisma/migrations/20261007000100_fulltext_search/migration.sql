-- Full-text search for Resource and KnowledgeEntry (raw SQL - not expressible in Prisma schema).
-- The "searchVector" columns and their GIN indexes are declared in schema.prisma as
-- Unsupported("tsvector") so Prisma tracks them; here they are rebuilt as STORED
-- generated columns so Postgres keeps them in sync on every INSERT/UPDATE.
-- pg_trgm (fuzzy matching) is enabled in the init migration.

-- array_to_string() is only STABLE, but generated columns need IMMUTABLE expressions.
-- Joining a text[] with a fixed separator is deterministic, so this wrapper is safe.
CREATE OR REPLACE FUNCTION immutable_array_to_string(arr text[], sep text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
AS $$ SELECT array_to_string(arr, sep) $$;

-- Resource: title + tags (weight A), description (weight B)
DROP INDEX IF EXISTS "Resource_searchVector_idx";
ALTER TABLE "Resource" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Resource" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, immutable_array_to_string("tags", ' ')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce("description", '')), 'B')
) STORED;
CREATE INDEX "Resource_searchVector_idx" ON "Resource" USING GIN ("searchVector");

-- KnowledgeEntry: question + keywords (weight A), answer (weight B)
DROP INDEX IF EXISTS "KnowledgeEntry_searchVector_idx";
ALTER TABLE "KnowledgeEntry" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "KnowledgeEntry" ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english'::regconfig, coalesce("question", '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, immutable_array_to_string("keywords", ' ')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce("answer", '')), 'B')
) STORED;
CREATE INDEX "KnowledgeEntry_searchVector_idx" ON "KnowledgeEntry" USING GIN ("searchVector");
