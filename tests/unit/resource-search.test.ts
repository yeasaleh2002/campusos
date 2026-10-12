import { describe, expect, it } from "vitest";
import {
  buildResourceSearchQuery,
  cursorFor,
  effectiveSort,
  normaliseQuery,
  type ResourceSearchRow,
} from "@/server/search/resource-search";

const base = { sort: "relevance" as const, limit: 20 };

describe("normaliseQuery", () => {
  it("expands campus shorthand", () => {
    expect(normaliseQuery("prev questions").terms).toEqual(["prev", "previous", "questions"]);
    expect(normaliseQuery("pyq dbms").terms).toEqual(["pyq", "previous", "question", "dbms", "database", "management"]);
    expect(normaliseQuery("os notes").terms).toEqual(["os", "operating", "systems", "notes"]);
  });

  it("detects course codes regardless of punctuation", () => {
    for (const input of ["CSE 2101", "cse-2101", "CSE2101"]) {
      const query = normaliseQuery(input);
      expect(query.compact).toBe("cse2101");
      expect(query.looksLikeCourseCode).toBe(true);
    }
    expect(normaliseQuery("data structures").looksLikeCourseCode).toBe(false);
  });

  it("collapses whitespace and caps length", () => {
    expect(normaliseQuery("  graph    theory ").text).toBe("graph theory");
    expect(normaliseQuery("x".repeat(500)).text).toHaveLength(100);
  });
});

describe("buildResourceSearchQuery", () => {
  it("never puts user input into the SQL text (parameterised only)", () => {
    const evil = "'; DROP TABLE \"Resource\"; --";
    const query = buildResourceSearchQuery({ ...base, q: evil, departmentId: "cdept0000000000000000000", type: "NOTES" });
    expect(query.sql).not.toContain("DROP TABLE");
    expect(query.sql).not.toContain(evil);
    expect(query.values).toContain(evil);
    expect(query.values).toContain("cdept0000000000000000000");
    expect(query.values).toContain("NOTES");
  });

  it("always restricts to approved, non-deleted resources", () => {
    const { sql } = buildResourceSearchQuery({ ...base, sort: "newest" });
    expect(sql).toContain(`r.status::text = 'APPROVED'`);
    expect(sql).toContain(`r."deletedAt" IS NULL`);
  });

  it("uses full-text, trigram and course-code matching when searching", () => {
    const { sql, values } = buildResourceSearchQuery({ ...base, q: "CSE 2101" });
    expect(sql).toContain("websearch_to_tsquery");
    expect(sql).toContain("plainto_tsquery");
    expect(sql).toContain("word_similarity");
    expect(sql).toContain("regexp_replace(lower(c.code)");
    expect(values).toContain("cse2101%");
  });

  it("skips course-code matching for ordinary words", () => {
    const { values } = buildResourceSearchQuery({ ...base, q: "algorithms" });
    expect(values.some((value) => typeof value === "string" && value.endsWith("%") && !value.startsWith("%"))).toBe(false);
  });

  it("adds only the filters that were provided", () => {
    const { sql } = buildResourceSearchQuery({ ...base, sort: "newest", semester: 3 });
    expect(sql).toContain("r.semester =");
    expect(sql).not.toContain(`r."courseId" =`);
    expect(sql).not.toContain("r.year =");
  });

  it("orders and pages by the right keyset per sort", () => {
    expect(buildResourceSearchQuery({ ...base, sort: "newest" }).sql).toMatch(/ORDER BY "createdAt" DESC, id DESC/);
    expect(buildResourceSearchQuery({ ...base, sort: "popular" }).sql).toMatch(/ORDER BY "downloadCount" DESC, id DESC/);
    expect(buildResourceSearchQuery({ ...base, q: "os" }).sql).toMatch(/ORDER BY score DESC, id DESC/);

    const paged = buildResourceSearchQuery({ ...base, sort: "popular", cursor: { v: 42, id: "cres" } });
    expect(paged.sql).toContain(`("downloadCount", id) <`);
    expect(paged.values).toEqual(expect.arrayContaining([42, "cres"]));
  });

  it("fetches one extra row to detect the next page", () => {
    expect(buildResourceSearchQuery({ ...base, limit: 20 }).values.at(-1)).toBe(21);
  });
});

describe("effectiveSort / cursorFor", () => {
  it("falls back to newest when relevance has no query", () => {
    expect(effectiveSort({ sort: "relevance" })).toBe("newest");
    expect(effectiveSort({ sort: "relevance", q: "dbms" })).toBe("relevance");
    expect(effectiveSort({ sort: "popular", q: "dbms" })).toBe("popular");
  });

  it("builds cursors from the sort column", () => {
    const row = { id: "r1", createdAt: new Date("2026-10-01T00:00:00Z"), downloadCount: 7, score: 1.234567 } as ResourceSearchRow;
    expect(cursorFor("newest", row)).toEqual({ v: "2026-10-01T00:00:00.000Z", id: "r1" });
    expect(cursorFor("popular", row)).toEqual({ v: 7, id: "r1" });
    expect(cursorFor("relevance", row)).toEqual({ v: 1.234567, id: "r1" });
  });
});
