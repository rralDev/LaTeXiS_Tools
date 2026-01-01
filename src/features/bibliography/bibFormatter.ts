import { BibLaTeXEntry } from "./bibParser";

/**
 * Format a BibEntry into BibLaTeX-compliant text.
 * - Preserves rich fields: abstract, keywords, note, url, doi
 * - Normalizes spacing and braces
 * - Outputs a stable, readable field order
 */
export function formatBibEntry(entry: BibLaTeXEntry): string {
  const type = entry.entryType || "article";
  const key =
    entry.citationKey && entry.citationKey.trim() !== ""
      ? entry.citationKey
      : "unnamed";

  const fields = entry.fields ?? {};

  const orderedFields = [
    "author",
    "editor",
    "title",
    "subtitle",
    "journaltitle",
    "booktitle",
    "year",
    "date",
    "volume",
    "number",
    "pages",
    "publisher",
    "location",
    "doi",
    "url",
    "urldate",
    "abstract",
    "keywords",
    "note"
  ];

  const lines: string[] = [];

  for (const field of orderedFields) {
    const value = fields[field];
    if (typeof value !== "string" || value.trim() === "") continue;

    lines.push(`  ${field} = {${normalizeValue(value)}},`);
  }

  for (const [field, value] of Object.entries(fields)) {
    if (orderedFields.includes(field)) continue;
    if (typeof value !== "string" || value.trim() === "") continue;

    lines.push(`  ${field} = {${normalizeValue(value)}},`);
  }

  return `@${type}{${key},\n${lines.join("\n")}\n}`;
}

function normalizeValue(value: string): string {
  return value.replace(/\s+/g, " ").replace(/\s*\n\s*/g, " ").trim();
}

/**
 * Explicit alias for clarity at call sites.
 * Do NOT change behavior.
 */
export function formatBibLaTeXEntry(entry: BibLaTeXEntry): string {
  return formatBibEntry(entry);
}