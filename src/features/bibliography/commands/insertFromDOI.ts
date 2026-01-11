import * as vscode from "vscode";
import { resolveDOI } from "../doiResolver";
import { formatBibLaTeXEntry } from "../bibFormatter";
import { writeBibEntry } from "../bibliographyManager";
import { insertCitation } from "../citeInserter";

/**
 * Registers the command to insert a bibliographic reference from a DOI.
 * NOTE: This is the command registration only.
 * The DOI resolution and BibLaTeX formatting logic lives elsewhere.
 */
export function registerInsertFromDOI(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.insertReferenceFromDOI",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
      }

      const doi = await vscode.window.showInputBox({
        title: "Insertar referencia desde DOI",
        prompt: "Ingresa el DOI (ej: 10.1000/xyz123)",
        placeHolder: "10.xxxx/xxxxx"
      });

      if (!doi || !doi.trim()) {
        return;
      }

      try {
        const metadata = await resolveDOI(doi);

        // Construct BibLaTeXEntry-compatible object
        const entryType = "article";

        // Generate citation key
        let citationKey = "ref" + Date.now();
        if (metadata.authors && Array.isArray(metadata.authors) && metadata.authors.length > 0) {
          const firstAuthor = metadata.authors[0];
          const lastName = firstAuthor.split(",")[0].trim();
          const year = metadata.year || "";
          if (lastName && year) {
            citationKey = `${lastName}${year}`;
          }
        }

        // Map fields
        const fields: Record<string, string> = {};
        if (metadata.authors && Array.isArray(metadata.authors)) {
          const authors = metadata.authors.join(" and ");
          if (authors) {
            fields.author = authors;
          }
        }
        if (metadata.title) {
          fields.title = metadata.title;
        }
        if (metadata.journal) {
          fields.journaltitle = metadata.journal;
        }
        if (metadata.year) {
          fields.year = String(metadata.year);
        }
        if (metadata.doi) {
          fields.doi = metadata.doi;
        }
        if (metadata.url) {
          fields.url = metadata.url;
        }
        if (metadata.abstract) {
          fields.abstract = metadata.abstract;
        }
        if (metadata.keywords && Array.isArray(metadata.keywords)) {
          fields.keywords = metadata.keywords.join(", ");
        }

        const entry = {
          entryType,
          citationKey,
          fields
        };

        const bibText = formatBibLaTeXEntry(entry);

        await writeBibEntry(entryType, bibText, citationKey);

        await insertCitation(citationKey);

        vscode.window.showInformationMessage(
          `LaTeXiS: Referencia agregada (${citationKey}).`
        );
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `LaTeXiS: Error al insertar referencia desde DOI. ${err?.message ?? err}`
        );
      }
    }
  );

  context.subscriptions.push(cmd);
}