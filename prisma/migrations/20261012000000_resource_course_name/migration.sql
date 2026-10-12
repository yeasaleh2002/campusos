-- Free-text course for resources whose course is not in the catalogue (nullable, additive).
ALTER TABLE "Resource" ADD COLUMN "courseName" VARCHAR(120);
