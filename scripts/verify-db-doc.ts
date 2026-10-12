/**
 * Checks databasedesign.md against prisma/schema.prisma:
 *   - every model has a "### Model" section,
 *   - every enum has a table row listing all of its values,
 *   - every foreign key appears in the relationship matrix with the right optionality and delete rule,
 *   - the model and enum counts quoted in the introduction are correct,
 *   - the campus calendar pieces (CampusClosure, BusTrip_no_off_days) are described.
 *
 *   npm run docs:verify-db
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts: string[]): string => readFileSync(path.join(root, ...parts), "utf8").split(/\r?\n/).join("\n");
const schema = read("prisma", "schema.prisma");
const doc = read("databasedesign.md");

const problems: string[] = [];
const fail = (message: string): void => {
  problems.push(message);
};

const models = [...schema.matchAll(/^model (\w+) \{\n([\s\S]*?)^\}/gm)].map((match) => ({ name: match[1], body: match[2] }));
const enums = [...schema.matchAll(/^enum (\w+) \{\n([\s\S]*?)^\}/gm)].map((match) => ({
  name: match[1],
  values: match[2]
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("//")),
}));

for (const model of models) {
  if (!new RegExp(`^### ${model.name}$`, "m").test(doc)) fail(`Model ${model.name} has no "### ${model.name}" section.`);
}

for (const entry of enums) {
  const row = doc.split("\n").find((line) => line.startsWith(`| \`${entry.name}\` |`));
  if (!row) {
    fail(`Enum ${entry.name} has no row in the Enums table.`);
    continue;
  }
  for (const value of entry.values) {
    if (!row.includes(`\`${value}\``)) fail(`Enum ${entry.name}: value ${value} is missing from its row.`);
  }
}

let relations = 0;
for (const model of models) {
  for (const line of model.body.split("\n")) {
    const match = /^\s+\w+\s+(\w+)(\?)?\s+@relation\((.*)\)/.exec(line);
    if (!match || !match[3].includes("fields:")) continue;
    relations += 1;
    const parent = match[1];
    const optional = match[2] ? "yes" : "no";
    const column = /fields: \[(\w+)\]/.exec(match[3])?.[1];
    const onDelete = /onDelete: (\w+)/.exec(match[3])?.[1] ?? "Restrict";
    const expected = `| ${model.name} | ${column} | ${parent} | ${optional} | ${onDelete} |`;
    if (!doc.includes(expected)) fail(`Relationship matrix is missing or wrong for: ${expected}`);
  }
}

const matrixRows = doc.split("\n").filter((line) => /^\| \w+ \| \w+ \| \w+ \| (yes|no) \| \w+ \|$/.test(line)).length;
if (matrixRows !== relations) fail(`The matrix has ${matrixRows} rows but the schema has ${relations} foreign keys.`);

if (!doc.includes(`covers every model (${models.length}) and every enum (${enums.length})`)) {
  fail(`The introduction must say "every model (${models.length}) and every enum (${enums.length})".`);
}
for (const needle of ["CampusClosure", "BusTrip_no_off_days", "20261013000000_campus_calendar"]) {
  if (!doc.includes(needle)) fail(`The campus calendar data is not described (missing "${needle}").`);
}

const listed = [...doc.matchAll(/^\| `(\d{14}_\w+)` \|/gm)].map((match) => match[1]);
const onDisk = readdirSync(path.join(root, "prisma", "migrations")).filter((name) => /^\d{14}_/.test(name));
for (const name of onDisk) {
  if (!listed.includes(name)) fail(`Migration ${name} is not listed in the migrations table.`);
}

if (problems.length > 0) {
  process.stderr.write(`databasedesign.md is out of date (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n${problems.map((problem) => `  - ${problem}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`databasedesign.md OK: ${models.length} models, ${enums.length} enums, ${relations} foreign keys, ${onDisk.length} migrations.\n`);
