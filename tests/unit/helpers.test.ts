import { describe, expect, it } from "vitest";
import { csvCell, csvRow } from "@/lib/csv";
import { slugify } from "@/lib/slug";
import { campusWeekRange } from "@/config/campus-calendar";
import { dhakaMonthRange } from "@/lib/time";
import { isTrustedUploadUrl, uploadKeyFromUrl } from "@/lib/upload-url";
import { canonicalCourseCode } from "@/server/services/academic.service";

describe("upload URL allowlist", () => {
  it("accepts UploadThing URLs and extracts the key", () => {
    expect(uploadKeyFromUrl("https://abc123.ufs.sh/f/Xyz-key_1.webp")).toBe("Xyz-key_1.webp");
    expect(uploadKeyFromUrl("https://utfs.io/f/legacyKey123")).toBe("legacyKey123");
  });

  it.each([
    "http://abc123.ufs.sh/f/key12345", // not https
    "https://evil.com/f/key12345",
    "https://ufs.sh.evil.com/f/key12345",
    "https://abc123.ufs.sh.evil.com/f/key12345",
    "https://user:pass@utfs.io/f/key12345",
    "https://utfs.io:8443/f/key12345",
    "https://utfs.io/f/../../etc/passwd",
    "javascript:alert(1)",
    "not a url",
  ])("rejects %s", (url) => {
    expect(isTrustedUploadUrl(url)).toBe(false);
  });
});

describe("csv", () => {
  it("quotes separators and doubles quotes", () => {
    expect(csvCell('Rahim "RJ", CSE')).toBe('"Rahim ""RJ"", CSE"');
  });

  it("neutralises formula injection", () => {
    expect(csvCell("=HYPERLINK(\"http://x\")")).toBe("\"'=HYPERLINK(\"\"http://x\"\")\"");
    expect(csvCell("+8801711")).toBe("'+8801711");
    expect(csvCell("@cmd")).toBe("'@cmd");
  });

  it("formats rows with CRLF", () => {
    expect(csvRow(["a", 1, null, new Date("2026-01-01T00:00:00Z")])).toBe("a,1,,2026-01-01T00:00:00.000Z\r\n");
  });
});

describe("slugify", () => {
  it("builds URL-safe slugs", () => {
    expect(slugify("CSE Fest '26: Hack & Learn!")).toBe("cse-fest-26-hack-learn");
    expect(slugify("Café Débat")).toBe("cafe-debat");
    expect(slugify("!!!")).toBe("item");
  });
});

describe("course codes", () => {
  it.each([["cse 2101", "CSE-2101"], ["CSE2101", "CSE-2101"], ["eee-1101", "EEE-1101"]])("%s → %s", (input, expected) => {
    expect(canonicalCourseCode(input)).toBe(expected);
  });
});

describe("Dhaka calendar maths (UTC+6, week starts Friday)", () => {
  it("finds the campus week for a Wednesday afternoon", () => {
    // Wed 2026-10-07 16:00 Dhaka = 10:00Z → week Fri 2026-10-02 00:00 Dhaka = 2026-10-01T18:00Z
    const { start, end } = campusWeekRange(new Date("2026-10-07T10:00:00Z"));
    expect(start.toISOString()).toBe("2026-10-01T18:00:00.000Z");
    expect(end.toISOString()).toBe("2026-10-08T18:00:00.000Z");
  });

  it("handles late Thursday night UTC already being Friday in Dhaka", () => {
    // Thu 2026-10-08 19:00Z = Fri 01:00 Dhaka → new week starts at 2026-10-08T18:00Z
    expect(campusWeekRange(new Date("2026-10-08T19:00:00Z")).start.toISOString()).toBe("2026-10-08T18:00:00.000Z");
  });

  it("maps a month to Dhaka midnight boundaries", () => {
    const { start, end } = dhakaMonthRange("2026-12");
    expect(start.toISOString()).toBe("2026-11-30T18:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T18:00:00.000Z");
  });
});
