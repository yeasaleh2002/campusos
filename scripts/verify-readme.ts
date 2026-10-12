/**
 * Checks README.md against the code:
 *   - every route handler (`src/app/api/**\/route.ts`, exported GET/POST/PATCH/PUT/DELETE) is documented as `METHOD /api/path`,
 *   - every documented endpoint has a route handler,
 *   - every environment variable in `.env.example` appears in the README and in `src/lib/env.ts`,
 *   - every `npm run <script>` the README mentions exists in package.json,
 *   - every relative markdown link points at a file that exists, and every in-page `#anchor` has a heading.
 *
 *   npm run docs:verify-readme
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (...parts: string[]): string => readFileSync(path.join(root, ...parts), "utf8").split(/\r?\n/).join("\n");
const readme = read("README.md");
const problems: string[] = [];
const fail = (message: string): void => {
  problems.push(message);
};

/** Normalises `[id]`, `{id}` and `:id` path parameters so naming differences do not matter. */
const normalise = (route: string): string => route.replace(/\[\.{0,3}\w+\]/g, "{}").replace(/\{\w+\}/g, "{}").replace(/:\w+/g, "{}").replace(/\/+$/, "");

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

// 1. Route handlers in code.
const apiRoot = path.join(root, "src", "app", "api");
const codeEndpoints = new Map<string, string>();
for (const file of walk(apiRoot).filter((name) => name.endsWith(`${path.sep}route.ts`))) {
  const source = readFileSync(file, "utf8");
  const route = `/api/${path.relative(apiRoot, path.dirname(file)).split(path.sep).join("/")}`.replace(/\/$/, "");
  const destructured = /export const \{([^}]+)\}\s*=/.exec(source)?.[1] ?? "";
  for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    const exported = new RegExp(`export (?:const|async function|function) ${method}\\b`).test(source) || new RegExp(`\\b${method}\\b`).test(destructured);
    if (exported) codeEndpoints.set(`${method} ${normalise(route)}`, `${method} ${route}`);
  }
}

// 2. Endpoints written in the README: `GET /api/x`, `POST | DELETE /api/x`, and "`GET /api/x` · `POST` · `PATCH /{id}`".
const documented = new Set<string>();
const verbs = "(?:GET|POST|PUT|PATCH|DELETE)";
const pathChars = "[\\w\\-/{}\\[\\]:.]*";
for (const line of readme.split("\n")) {
  for (const match of line.matchAll(new RegExp(`(${verbs}(?:\\s*[|,/·]\\s*${verbs})*)\\s+(/api/${pathChars})`, "g"))) {
    const target = normalise(match[2].replace(/[.,;:]+$/, ""));
    for (const verb of match[1].match(new RegExp(verbs, "g")) ?? []) documented.add(`${verb} ${target}`);
  }
  const base = new RegExp(`(${verbs})\\s+(/api/${pathChars})`).exec(line);
  if (!base) continue;
  const basePath = normalise(base[2].replace(/[.,;:]+$/, ""));
  for (const extra of line.matchAll(new RegExp(`\`(${verbs})\``, "g"))) documented.add(`${extra[1]} ${basePath}`);
  for (const sub of line.matchAll(new RegExp(`(${verbs})\\s+(/\\{\\w+\\}[\\w\\-/{}]*)`, "g"))) documented.add(`${sub[1]} ${normalise(basePath + sub[2])}`);
}

for (const [key, label] of codeEndpoints) {
  if (!documented.has(key)) fail(`Route ${label} has no entry in the README.`);
}
for (const key of documented) {
  if (!codeEndpoints.has(key)) fail(`README documents ${key} but no route handler exports it.`);
}

// 3. Environment variables.
const envExample = read(".env.example");
const envSource = read("src", "lib", "env.ts");
const names = [...envExample.matchAll(/^([A-Z][A-Z0-9_]+)=/gm)].map((match) => match[1]);
for (const name of names) {
  if (!readme.includes(name)) fail(`Environment variable ${name} (.env.example) is not mentioned in the README.`);
  if (!envSource.includes(name)) fail(`Environment variable ${name} (.env.example) is not read in src/lib/env.ts.`);
}
for (const match of envSource.matchAll(/^\s{2}([A-Z][A-Z0-9_]+):\s*z\./gm)) {
  if (!names.includes(match[1])) fail(`src/lib/env.ts reads ${match[1]} but .env.example does not list it.`);
}

// 4. npm scripts.
const scripts = (JSON.parse(read("package.json")) as { scripts: Record<string, string> }).scripts;
for (const match of readme.matchAll(/npm run ([\w:-]+)/g)) {
  if (!(match[1] in scripts)) fail(`README mentions "npm run ${match[1]}" but package.json has no such script.`);
}

// 5. Links and anchors.
const slug = (heading: string): string =>
  heading
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s/g, "-");
const anchors = new Set([...readme.matchAll(/^#{1,6}\s+(.+)$/gm)].map((match) => slug(match[1])));
for (const match of readme.matchAll(/\]\(([^)\s]+)\)/g)) {
  const target = match[1];
  if (/^(https?:|mailto:)/.test(target)) continue;
  if (target.startsWith("#")) {
    if (!anchors.has(target.slice(1))) fail(`In-page link ${target} has no matching heading.`);
    continue;
  }
  const file = target.split("#")[0];
  if (file && !existsSync(path.join(root, file))) fail(`Link target ${file} does not exist.`);
}

if (problems.length > 0) {
  process.stderr.write(`README.md is out of date (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n${problems.map((problem) => `  - ${problem}`).join("\n")}\n`);
  process.exit(1);
}
process.stdout.write(`README.md OK: ${codeEndpoints.size} endpoints, ${names.length} env variables, ${Object.keys(scripts).length} npm scripts checked.\n`);
