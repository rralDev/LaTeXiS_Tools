/**
 * resetMetrics.ts
 *
 * Comando para reiniciar métricas de escritura académica.
 */

import * as vscode from "vscode";
import { TrackerStorage } from "../tracker/trackerStorage";

export function resetMetricsCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "latexIS.resetWritingMetrics",
    async () => {
      const confirm = await vscode.window.showWarningMessage(
        "Reset all writing metrics?",
        { modal: true },
        "Reset"
      );

      if (confirm !== "Reset") {
        return;
      }

      const storage = new TrackerStorage(context.workspaceState);
      storage.reset();

      vscode.window.showInformationMessage("Writing metrics have been reset.");
    }
  );
}
