import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** The seeded FAQ text must follow the campus rule: open Friday to Tuesday, closed Wednesday and Thursday, no bus Wed/Thu. */
const seed = readFileSync(path.join(process.cwd(), "prisma", "seed-campus.ts"), "utf8").replaceAll("\r\n", "\n");

describe("seeded FAQ wording", () => {
  it("never states the old weekly rule", () => {
    expect(seed).not.toMatch(/Saturday to Thursday|Sunday to Thursday|Sat[-–]Thu|Sun[-–]Thu/);
    expect(seed).not.toMatch(/no (bus )?service (runs )?on Fridays?/i);
  });

  it("answers the Friday questions with yes", () => {
    const bus = /\["BUS", "Do buses run on \{\{FIRST\}\}\?", "Yes\./;
    const campus = /\["GENERAL", "Is the university open on \{\{FIRST\}\}\?", "Yes\./;
    expect(seed).toMatch(bus);
    expect(seed).toMatch(campus);
  });

  it("answers the off-day questions with no and uses the placeholders for the days", () => {
    expect(seed).toMatch(/\["BUS", "Do buses run on \{\{OFF\}\}\?", "No\./);
    expect(seed).toMatch(/\["GENERAL", "Is the university open on \{\{OFF\}\}\?", "No\./);
    expect(seed).toMatch(/\["GENERAL", "Are there classes on \{\{OFF\}\}\?", "No\./);
  });

  it("includes the Banglish spellings of the off days as keywords", () => {
    for (const word of ["budhbar", "brihospotibar", "bihospotibar", "shukrobar"]) expect(seed).toContain(`"${word}"`);
  });

  it("retires sample entries the seed no longer contains", () => {
    expect(seed).toMatch(/question: \{ notIn: current \}/);
  });
});
