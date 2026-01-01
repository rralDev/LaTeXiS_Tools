import * as vscode from "vscode";

/**
 * Master command — Manage References (LaTeXiS)
 * --------------------------------------------
 * This command acts as a central hub for all bibliography-related actions.
 * It delegates execution to existing commands.
 */
export function registerManageReferences(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.manageReferences",
    async () => {
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: "⭐ Configuración inicial de bibliografía",
            description: "Configura BibLaTeX, Biber, estructura y archivos .bib (recomendado)"
          },
          {
            label: "➤ Agregar referencia desde DOI",
            description: "Resolver un DOI y agregar automáticamente la referencia"
          },
          {
            label: "➤ Agregar referencia desde título",
            description: "Buscar y agregar referencia a partir del título"
          },
          {
            label: "➤ Cambiar estilo de citación",
            description: "Cambiar estilo BibLaTeX (APA, IEEE, Chicago, etc.)"
          }
        ],
        {
          title: "📚 Gestionar referencias — LaTeXiS",
          placeHolder: "Selecciona una acción"
        }
      );

      if (!choice) {
        return;
      }

      try {
        switch (choice.label) {
          case "⭐ Configuración inicial de bibliografía":
            await vscode.commands.executeCommand("latexis.initialSetup");
            break;

          case "➤ Agregar referencia desde DOI":
            await vscode.commands.executeCommand("latexis.insertReferenceFromDOI");
            break;

          case "➤ Agregar referencia desde título":
            await vscode.commands.executeCommand("latexis.insertReferenceFromTitle");
            break;

          case "➤ Cambiar estilo de citación":
            await vscode.commands.executeCommand("latexis.changeCitationStyle");
            break;
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `LaTeXiS: Error al gestionar referencias. ${err?.message ?? err}`
        );
      }
    }
  );

  context.subscriptions.push(cmd);
}