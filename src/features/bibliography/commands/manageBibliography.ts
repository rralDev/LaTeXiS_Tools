import * as vscode from "vscode";

/**
 * Entry point for managing bibliography in LaTeXiS.
 * For now this command acts as a hub / placeholder for future features:
 *  - view .bib entries
 *  - deduplicate
 *  - format / normalize
 *  - diagnostics
 */
export function registerManageBibliography(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.manageBibliography",
    async () => {
      const options = [
        "📚 Ver archivo .bib activo",
        "🧹 Limpiar / normalizar referencias",
        "🔁 Deduplicar referencias",
        "ℹ️ Estado de la bibliografía"
      ];

      const choice = await vscode.window.showQuickPick(options, {
        placeHolder: "Gestión de bibliografía (LaTeXiS)"
      });

      if (!choice) {
        return;
      }

      switch (choice) {
        case options[0]:
          vscode.window.showInformationMessage(
            "LaTeXiS: Esta opción abrirá el archivo .bib activo (pendiente de implementación)."
          );
          break;

        case options[1]:
          vscode.window.showInformationMessage(
            "LaTeXiS: Normalización BibLaTeX (pendiente de implementación)."
          );
          break;

        case options[2]:
          vscode.window.showInformationMessage(
            "LaTeXiS: Deduplicación de referencias (pendiente de implementación)."
          );
          break;

        case options[3]:
          vscode.window.showInformationMessage(
            "LaTeXiS: Estado de la bibliografía (pendiente de implementación)."
          );
          break;
      }
    }
  );

  context.subscriptions.push(cmd);
}