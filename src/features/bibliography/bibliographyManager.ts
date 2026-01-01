import * as fs from "fs";
import * as path from "path";
import * as vscode from "vscode";

/**
 * Result of locating or creating a bibliography file
 */
export interface BibliographyFile {
  uri: vscode.Uri;
  content: string;
}

/**
 * Map BibLaTeX entry types to bibliography files
 */
const BIB_FILE_MAP: Record<string, string> = {
  article: "articulos.bib",
  book: "libros.bib",
  inbook: "libros.bib",
  incollection: "libros.bib",
  inproceedings: "conferencias.bib",
  proceedings: "conferencias.bib",
  thesis: "tesis.bib",
  phdthesis: "tesis.bib",
  mastersthesis: "tesis.bib",
  online: "otros.bib",
  misc: "otros.bib"
};

/**
 * Resolve the bibliography directory and ensure it exists
 */
async function ensureBibliographyDir(): Promise<string> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error("No workspace folder open.");
  }

  const root = folders[0].uri.fsPath;
  const bibDir = path.join(root, "bibliography");

  await fs.promises.mkdir(bibDir, { recursive: true });
  return bibDir;
}

/**
 * Find or create a .bib file based on BibLaTeX entry type
 */
export async function findOrCreateBibFileByType(
  entryType: string
): Promise<BibliographyFile> {
  const bibDir = await ensureBibliographyDir();

  const normalizedType = entryType.toLowerCase();
  const fileName = BIB_FILE_MAP[normalizedType] ?? "otros.bib";
  const bibPath = path.join(bibDir, fileName);

  if (!fs.existsSync(bibPath)) {
    await fs.promises.writeFile(bibPath, "", { flag: "wx" }).catch(() => undefined);
  }

  const content = await fs.promises.readFile(bibPath, "utf8").catch(() => "");
  return { uri: vscode.Uri.file(bibPath), content };
}

/**
 * Check whether a citation key already exists in the bibliography
 */
export function hasCitationKey(bibContent: string, citeKey: string): boolean {
  const rx = new RegExp(`@\\w+\\s*\\{\\s*${citeKey}\\s*,`, "i");
  return rx.test(bibContent);
}

/**
 * Check whether a citation key already exists across all bibliography files
 */
export async function citationKeyExists(citeKey: string): Promise<boolean> {
  const bibDir = await ensureBibliographyDir();
  const files = await fs.promises.readdir(bibDir);

  for (const file of files.filter(f => f.endsWith(".bib"))) {
    const content = await fs.promises.readFile(path.join(bibDir, file), "utf8");
    if (hasCitationKey(content, citeKey)) {
      return true;
    }
  }
  return false;
}

/**
 * Check whether a DOI already exists across all bibliography files
 */
export async function doiExists(doi: string): Promise<boolean> {
  const bibDir = await ensureBibliographyDir();
  const files = await fs.promises.readdir(bibDir);
  const rx = new RegExp(`doi\\s*=\\s*\\{\\s*${doi.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*\\}`, "i");

  for (const file of files.filter(f => f.endsWith(".bib"))) {
    const content = await fs.promises.readFile(path.join(bibDir, file), "utf8");
    if (rx.test(content)) {
      return true;
    }
  }
  return false;
}

/**
 * Append a BibLaTeX entry to the bibliography file, preventing duplicates and inserting in order.
 */
export async function appendBibEntry(
  bibFile: BibliographyFile,
  entry: string,
  citeKey: string
): Promise<void> {
  if (hasCitationKey(bibFile.content, citeKey)) {
    vscode.window.showWarningMessage(
      `LaTeXiS: La referencia '${citeKey}' ya existe en ${path.basename(
        bibFile.uri.fsPath
      )}.`
    );
    return;
  }

  const entries = bibFile.content
    .split(/\n\s*\n/)
    .map(e => e.trim())
    .filter(Boolean);

  entries.push(entry.trim());

  const sorted = entries.sort((a, b) => {
    const ka = a.match(/@\w+\s*\{\s*([^,]+),/i)?.[1] ?? "";
    const kb = b.match(/@\w+\s*\{\s*([^,]+),/i)?.[1] ?? "";
    return ka.localeCompare(kb);
  });

  const updated = sorted.join("\n\n") + "\n";
  await fs.promises.writeFile(bibFile.uri.fsPath, updated, "utf8");
}

/**
 * High-level helper used by commands.
 * Routes the entry to the correct .bib file based on entry type.
 */
export async function writeBibEntry(
  entryType: string,
  entry: string,
  citeKey: string
): Promise<void> {
  const bibFile = await findOrCreateBibFileByType(entryType);
  await appendBibEntry(bibFile, entry, citeKey);
}
