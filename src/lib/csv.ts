/** Spreadsheet apps execute cells starting with these characters as formulas. */
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

/**
 * Escapes one CSV cell (RFC 4180) and neutralises CSV/formula injection by
 * prefixing risky values with an apostrophe.
 */
export function csvCell(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined) return "";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (typeof value === "string" && FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvRow(values: ReadonlyArray<string | number | Date | null | undefined>): string {
  return `${values.map(csvCell).join(",")}\r\n`;
}
