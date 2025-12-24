import * as vscode from "vscode";
import { findMainTexDocument } from "../extension";

export function registerInsertAPAConfig(context: vscode.ExtensionContext) {
  const insertAPAConfig = vscode.commands.registerCommand(
    "latexis.insertAPAConfig",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No hay un editor activo.");
        return;
      }

      const activeDoc = editor.document;
      const mainDocument = await findMainTexDocument(activeDoc);
      const mainText = mainDocument.getText();

      if (!mainText.includes("\\documentclass")) {
        vscode.window.showWarningMessage(
          "No se encontró \\documentclass en el archivo principal."
        );
        return;
      }

      if (mainText.includes("biblatex")) {
        vscode.window.showInformationMessage(
          "Este archivo ya contiene una configuración con biblatex."
        );
        return;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      let bibResource = "bibliografia.bib";
      let shouldCreateBibFile = false;

      if (workspaceFolders && workspaceFolders.length > 0) {
        const bibFiles = await vscode.workspace.findFiles("**/*.bib");
        if (bibFiles.length === 1) {
          bibResource = vscode.workspace.asRelativePath(bibFiles[0], false);
        } else if (bibFiles.length === 0) {
          shouldCreateBibFile = true;
        }
      } else {
        shouldCreateBibFile = true;
      }

      const lines = mainText.split("\n");
      let insertLine = 0;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("\\documentclass")) {
          insertLine = i + 1;
          break;
        }
      }

      const apaBlock =
`% ====================================================
%   Configuración APA (LaTeXiS)
% ====================================================
\\usepackage[backend=biber,style=apa]{biblatex}
\\DeclareLanguageMapping{spanish}{spanish-apa}
\\usepackage{csquotes}

% Archivo(s) de bibliografía
\\addbibresource{${bibResource}}
% ====================================================
`;

      const edit = new vscode.WorkspaceEdit();
      edit.insert(mainDocument.uri, new vscode.Position(insertLine, 0), apaBlock);
      await vscode.workspace.applyEdit(edit);

      if (!mainText.includes("\\printbibliography")) {
        const refreshed = mainDocument.getText();
        const endIndex = refreshed.lastIndexOf("\\end{document}");
        if (endIndex !== -1) {
          const beforeEnd = refreshed.substring(0, endIndex);
          const afterEnd = refreshed.substring(endIndex);

          const newContent =
`${beforeEnd}

% ============================
%   Bibliografía (LaTeXiS)
% ============================
\\printbibliography
% ============================
${afterEnd}`;

          const fullEdit = new vscode.WorkspaceEdit();
          fullEdit.replace(
            mainDocument.uri,
            new vscode.Range(0, 0, mainDocument.lineCount, 0),
            newContent
          );
          await vscode.workspace.applyEdit(fullEdit);
        }
      }

      if (shouldCreateBibFile && workspaceFolders && workspaceFolders.length > 0) {
        const root = workspaceFolders[0].uri;
        const bibUri = vscode.Uri.joinPath(root, bibResource);
        try {
          await vscode.workspace.fs.stat(bibUri);
        } catch {
          const encoder = new TextEncoder();
          const initialContent =
`% ====================================================
% Archivo de bibliografía creado por LaTeXiS
% Referencia de ejemplo recomendada:
% Lamport, L. (1994). LaTeX: A Document Preparation System.
% ====================================================

@book{Lamport1994,
  author    = {Lamport, Leslie},
  title     = {LaTeX: A Document Preparation System},
  year      = {1994},
  edition   = {2},
  publisher = {Addison-Wesley}
}
`;
          await vscode.workspace.fs.writeFile(
            bibUri,
            encoder.encode(initialContent)
          );
        }
      }

      vscode.window.showInformationMessage(
        "Configuración APA insertada correctamente."
      );
    }
  );

  context.subscriptions.push(insertAPAConfig);
}