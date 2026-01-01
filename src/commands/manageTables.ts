import * as vscode from "vscode";

/**
 * 📊 Insertar tabla — LaTeXiS
 * --------------------------------
 * Master command for all table-related actions.
 * This command ONLY dispatches to existing table commands.
 */
export function registerManageTables(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.manageTables",
    async () => {
      const choice = await vscode.window.showQuickPick(
        [
          {
            label: "➤ Desde Excel",
            description: "Insertar tabla desde archivo Excel (.xlsx)"
          },
          {
            label: "➤ Desde portapapeles",
            description: "Insertar tabla desde datos copiados (TSV / CSV)"
          }
        ],
        {
          title: "📊 Insertar tabla — LaTeXiS",
          placeHolder: "Selecciona el origen de la tabla"
        }
      );

      if (!choice) return;

      try {
        switch (choice.label) {
          case "➤ Desde Excel":
            await vscode.commands.executeCommand("latexis.insertExcelTable");
            break;

          case "➤ Desde portapapeles":
            await vscode.commands.executeCommand("latexis.pasteSimpleTable");
            break;
        }
      } catch (err: any) {
        vscode.window.showErrorMessage(
          `LaTeXiS: Error al insertar tabla. ${err?.message ?? err}`
        );
      }
    }
  );

  context.subscriptions.push(cmd);
}
