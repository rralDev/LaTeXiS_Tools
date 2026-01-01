import * as vscode from "vscode";
import { formatBibLaTeXEntry } from "../bibFormatter";
import { writeBibEntry, citationKeyExists, doiExists } from "../bibliographyManager";
import { insertCitation } from "../citeInserter";

type TitleSearchMetadata = {
  type?: string;
  title?: string;
  authors?: string[];
  year?: number;
  journal?: string;
  publisher?: string;
  doi?: string;
  url?: string;
};

async function searchByTitle(title: string): Promise<TitleSearchMetadata | null> {
  const q = title.trim();
  if (!q) return null;

  // 1) Try OpenAlex
  try {
    const oaUrl = `https://api.openalex.org/works?search=${encodeURIComponent(q)}&per-page=1`;
    const r = await fetch(oaUrl, {
      headers: {
        "User-Agent": "LaTeXiS VS Code Extension",
        "Accept": "application/json"
      }
    });
    if (r.ok) {
      const data: any = await r.json();
      const w = data?.results?.[0];
      if (w) {
        const authors: string[] = (w?.authorships ?? [])
          .map((a: any) => a?.author?.display_name)
          .filter(Boolean);

        const doiRaw: string | undefined = w?.doi;
        const doi = doiRaw ? doiRaw.replace(/^https?:\/\/doi\.org\//i, "") : undefined;

        return {
          type: (w?.type_crossref ?? w?.type) || "article",
          title: w?.title,
          authors,
          year: w?.publication_year,
          journal: w?.primary_location?.source?.display_name,
          publisher: w?.primary_location?.source?.host_organization_name,
          doi,
          url: w?.primary_location?.landing_page_url || w?.id
        };
      }
    }
  } catch {
    // ignore and try Crossref
  }

  // 2) Fallback: Crossref
  try {
    const crUrl = `https://api.crossref.org/works?query.title=${encodeURIComponent(q)}&rows=1`;
    const r = await fetch(crUrl, {
      headers: {
        "User-Agent": "LaTeXiS VS Code Extension",
        "Accept": "application/json"
      }
    });
    if (!r.ok) return null;

    const data: any = await r.json();
    const item = data?.message?.items?.[0];
    if (!item) return null;

    const authors: string[] = (item?.author ?? [])
      .map((a: any) => {
        const family = a?.family || "";
        const given = a?.given || "";
        const full = `${family}${family && given ? ", " : ""}${given}`.trim();
        return full || null;
      })
      .filter(Boolean);

    const year = item?.issued?.["date-parts"]?.[0]?.[0];

    return {
      type: item?.type || "article",
      title: Array.isArray(item?.title) ? item.title[0] : item?.title,
      authors,
      year: typeof year === "number" ? year : undefined,
      journal: Array.isArray(item?.["container-title"]) ? item["container-title"][0] : item?.["container-title"],
      publisher: item?.publisher,
      doi: item?.DOI,
      url: Array.isArray(item?.URL) ? item.URL[0] : item?.URL
    };
  } catch {
    return null;
  }
}

/**
 * Insert bibliography entry from Title (OpenAlex).
 */
export function registerInsertFromTitle(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.insertReferenceFromTitle",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No hay editor activo.");
        return;
      }

      const title = await vscode.window.showInputBox({
        title: "Insertar referencia desde título",
        prompt: "Ingresa el título del artículo o libro",
        placeHolder: "LaTeX: A Document Preparation System"
      });

      if (!title || !title.trim()) return;

      try {
        const metadata = await searchByTitle(title);

        if (!metadata) {
          vscode.window.showWarningMessage(
            "LaTeXiS: No se encontró ninguna referencia con ese título."
          );
          return;
        }

        // Avoid duplicates by DOI
        if (metadata.doi && await doiExists(metadata.doi)) {
          vscode.window.showInformationMessage(
            "LaTeXiS: Esta referencia ya existe en la bibliografía (mismo DOI)."
          );
          return;
        }

        const entryType = metadata.type || "article";

        // Base citation key: AuthorYear
        let baseKey = "ref";
        if (metadata.authors?.length && metadata.year) {
          const firstAuthor = metadata.authors[0].trim();

          let lastName = firstAuthor;
          if (firstAuthor.includes(",")) {
            // Format: "Last, First"
            lastName = firstAuthor.split(",")[0].trim();
          } else {
            // Format: "First Middle Last"
            const parts = firstAuthor.split(/\s+/);
            lastName = parts[parts.length - 1];
          }

          // Normalize key (remove accents, spaces, symbols)
          lastName = lastName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-zA-Z]/g, "");

          baseKey = `${lastName}${metadata.year}`;
        }

        let citationKey = baseKey;
        let suffix = "a";
        while (await citationKeyExists(citationKey)) {
          citationKey = `${baseKey}${suffix}`;
          suffix = String.fromCharCode(suffix.charCodeAt(0) + 1);
        }

        const fields: Record<string, string> = {};

        if (metadata.authors?.length) {
          fields.author = metadata.authors.join(" and ");
        }
        if (metadata.title) fields.title = metadata.title;
        if (metadata.year) fields.year = String(metadata.year);
        if (metadata.journal) fields.journaltitle = metadata.journal;
        if (metadata.publisher) fields.publisher = metadata.publisher;
        if (metadata.doi) fields.doi = metadata.doi;
        if (metadata.url) fields.url = metadata.url;

        const entry = { entryType, citationKey, fields };
        const bibText = formatBibLaTeXEntry(entry);

        await writeBibEntry(entryType, bibText, citationKey);
        await insertCitation(citationKey);

        vscode.window.showInformationMessage(
          `LaTeXiS: Referencia agregada (${citationKey}).`
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `LaTeXiS: Error al insertar referencia desde título. ${err?.message ?? err}`
        );
      }
    }
  );

  context.subscriptions.push(cmd);
}
