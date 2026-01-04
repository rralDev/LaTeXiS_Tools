import * as vscode from "vscode";
import { findMainTexDocument, findPackageTargetDocument } from "../utils/latexDocuments";

/**
 * Insert APA BibLaTeX configuration into main TeX file.
 *
 * RESPONSIBILITY OF THIS COMMAND:
 * - Ensure BibLaTeX APA package is loaded in the preamble
 * - Ensure \addbibresource{} entries exist
 *
 * NOT RESPONSIBLE FOR:
 * - Creating bibliography files (handled by initialSetup)
 * - Inserting \printbibliography (handled by initialSetup)
 */
export function registerInsertAPAConfig(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.insertAPAConfig",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No hay un editor activo.");
        return;
      }

      const mainDoc = await findMainTexDocument(editor.document);
      const targetDocument = await findPackageTargetDocument(mainDoc);
      let text = targetDocument.getText();

      // --------------------------------------------------
      // 1. Ensure BibLaTeX APA package (PREAMBLE ONLY)
      // --------------------------------------------------
      if (!/\\usepackage(\[[^\]]*\])?\{biblatex\}/.test(text)) {
        text = text.replace(
          /(\\documentclass[^\n]*\n)/,
          `$1` +
          `\\usepackage[backend=biber,style=apa]{biblatex}\n` +
          `\\DeclareLanguageMapping{spanish}{spanish-apa}\n` +
          `\\usepackage{csquotes}\n\n`
        );
      }

      // --------------------------------------------------
      // 2. Ensure managed \addbibresource block
      // --------------------------------------------------
      if (!text.includes("% Bibliografía (LaTeXiS)")) {
        const bibBlock =
`% ============================
% Bibliografía (LaTeXiS)
% ============================
\\addbibresource{bibliography/articulos.bib}
\\addbibresource{bibliography/libros.bib}
\\addbibresource{bibliography/tesis.bib}
\\addbibresource{bibliography/reportes.bib}
\\addbibresource{bibliography/online.bib}
\\addbibresource{bibliography/otros.bib}
% ============================

`;
        text = text.replace(
          /(\\usepackage[^\n]*\{biblatex\}[^\n]*\n)/,
          `$1${bibBlock}`
        );
      }

      // --------------------------------------------------
      // 3. Apply edit (FULL DOCUMENT REPLACE)
      // --------------------------------------------------
      const edit = new vscode.WorkspaceEdit();
      edit.replace(
        targetDocument.uri,
        new vscode.Range(
          0,
          0,
          targetDocument.lineCount,
          targetDocument.lineAt(targetDocument.lineCount - 1).text.length
        ),
        text
      );

      await vscode.workspace.applyEdit(edit);

      vscode.window.showInformationMessage(
        "LaTeXiS: Configuración APA aplicada (preambulo actualizado)."
      );
    }
  );

  context.subscriptions.push(cmd);
}