/**
 * showMetrics.ts
 *
 * Comando para mostrar métricas de escritura académica.
 */

import * as vscode from "vscode";
import { TrackerStorage } from "../tracker/trackerStorage";
import { MetricsReporter } from "../reporters/metricsReporter";

export function showMetricsCommand(
  context: vscode.ExtensionContext
): vscode.Disposable {
  return vscode.commands.registerCommand(
    "latexIS.showWritingMetrics",
    () => {
      const storage = new TrackerStorage(context.workspaceState);
      const state = storage.loadState();

      const markdown = MetricsReporter.generateMarkdown(state.metrics);

      vscode.workspace
        .openTextDocument({ content: markdown, language: "markdown" })
        .then(doc => {
          vscode.window.showTextDocument(doc, {
            preview: true,
            viewColumn: vscode.ViewColumn.Active,
          });
        });
    }
  );
}
