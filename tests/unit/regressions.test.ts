import { describe, expect, it } from "vitest";
import { invalidateLostFound, queryKeys } from "@/lib/query-client";
import { createResourceSchema } from "@/server/validators/resource.validators";

/** Regression tests for the bugs reported before the final submission (CHANGELOG 0.9.0). */

const COURSE_ID = "c1234567890abcdefghij1234";
const DEPARTMENT_ID = "c0987654321abcdefghij4321";

const base = {
  title: "Data Structures midterm 2025",
  type: "QUESTION_PAPER",
  departmentId: DEPARTMENT_ID,
  fileUrl: "https://utfs.io/f/abcdef123456",
  fileKey: "abcdef123456",
  fileSize: 120_000,
  mimeType: "application/pdf",
};

describe("custom course on resource upload", () => {
  it("accepts a listed course on its own", () => {
    expect(createResourceSchema.safeParse({ ...base, courseId: COURSE_ID }).success).toBe(true);
  });

  it("accepts a typed course name when the course is not listed", () => {
    const result = createResourceSchema.safeParse({ ...base, courseName: "Advanced Robotics" });
    expect(result.success).toBe(true);
  });

  it("rejects both a listed course and a typed name", () => {
    const result = createResourceSchema.safeParse({ ...base, courseId: COURSE_ID, courseName: "Advanced Robotics" });
    expect(result.success).toBe(false);
  });

  it("rejects a one-character course name", () => {
    expect(createResourceSchema.safeParse({ ...base, courseName: "A" }).success).toBe(false);
  });
});

describe("lost and found refreshes without a page reload", () => {
  it("invalidates both the public board and the user's own posts", async () => {
    const invalidated: Array<readonly unknown[]> = [];
    const client = {
      invalidateQueries: async ({ queryKey }: { queryKey: readonly unknown[] }) => {
        invalidated.push(queryKey);
      },
    };
    await invalidateLostFound(client as never);
    expect(invalidated).toContainEqual(["lost-found"]);
    expect(invalidated).toContainEqual(queryKeys.myLostFound);
  });
});
