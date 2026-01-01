/**
 * Represents a generic BibLaTeX entry.
 * We intentionally keep this flexible to preserve fields like
 * abstract, keywords, note, url, doi, etc.
 */
export type BibLaTeXEntry = {
  entryType: string;        // e.g. article, book, inproceedings
  citationKey: string;      // e.g. smith2020deep
  fields: Record<string, string>;
};

/**
 * Very lightweight BibLaTeX parser.
 * This is NOT a full parser — it is designed for LaTeXiS needs:
 *  - read entries
 *  - preserve unknown fields
 *  - allow later formatting / normalization
 */
export function parseBibLaTeX(content: string): BibLaTeXEntry[] {
  const entries: BibLaTeXEntry[] = [];

  const entryRegex = /@(\w+)\s*\{\s*([^,]+),([\s\S]*?)\n\}/g;
  let match: RegExpExecArray | null;

  while ((match = entryRegex.exec(content)) !== null) {
    const [, entryType, citationKey, body] = match;

    const fields: Record<string, string> = {};
    const fieldRegex = /(\w+)\s*=\s*\{([\s\S]*?)\},?/g;
    let fieldMatch: RegExpExecArray | null;

    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const [, key, value] = fieldMatch;
      fields[key.toLowerCase()] = value.trim();
    }

    entries.push({
      entryType: entryType.toLowerCase(),
      citationKey: citationKey.trim(),
      fields
    });
  }

  return entries;
}

/**
 * Serialize BibLaTeX entries back to text.
 * Keeps all fields intact.
 */
export function serializeBibLaTeX(entries: BibLaTeXEntry[]): string {
  return entries
    .map(e => {
      const fields = Object.entries(e.fields)
        .map(([k, v]) => `  ${k} = {${v}},`)
        .join("\n");

      return `@${e.entryType}{${e.citationKey},\n${fields}\n}`;
    })
    .join("\n\n");
}