/**
 * metricScanner.ts
 *
 * Responsabilidad:
 *  - Escanear archivos LaTeX del workspace
 *  - Integrar WritingTracker con eventos de VS Code
 *
 * No presenta UI.
 */

import * as vscode from "vscode";
import { WritingTracker } from "../tracker/writingTracker";
import { TrackerStorage } from "../tracker/trackerStorage";

export class MetricScanner {
  private tracker: WritingTracker;

  constructor(
    private readonly context: vscode.ExtensionContext,
    private readonly storage: TrackerStorage
  ) {
    const state = this.storage.loadState();
    this.tracker = new WritingTracker(state);
  }

  /**
   * Intenta resolver el archivo main.tex del workspace.
   * Estrategia:
   *  - Buscar archivos .tex
   *  - Seleccionar el que contenga \documentclass
   */
  private async resolveMainDocument(): Promise<vscode.TextDocument | null> {
    const texFiles = await vscode.workspace.findFiles("**/*.tex", "**/node_modules/**");

    for (const file of texFiles) {
      const doc = await vscode.workspace.openTextDocument(file);
      if (doc.getText().includes("\\documentclass")) {
        return doc;
      }
    }

    console.warn("[MetricScanner] No se encontró main.tex");
    return null;
  }

  /**
   * Resuelve archivos incluidos desde el CUERPO del documento
   * (entre \begin{document} y \end{document})
   */
  private resolveIncludedTexFiles(
    mainDoc: vscode.TextDocument,
    documentBody: string
  ): string[] {
    const lines = documentBody.split(/\r?\n/);

    const files: string[] = [mainDoc.fileName];
    const includeRegex = /^\s*\\(input|include)\{([^}]+)\}/;

    for (const line of lines) {
      if (line.trim().startsWith("%")) continue;

      const match = line.match(includeRegex);
      if (!match) continue;

      let relativePath = match[2];
      if (!relativePath.endsWith(".tex")) {
        relativePath += ".tex";
      }

      const baseDir = vscode.Uri.file(mainDoc.fileName).with({
        path: mainDoc.fileName.replace(/\/[^/]+$/, ""),
      });

      const fullPath = vscode.Uri.joinPath(baseDir, relativePath).fsPath;
      files.push(fullPath);
    }

    return files;
  }

  /**
   * Extrae solo el contenido entre \begin{document} y \end{document}
   */
  private extractDocumentBody(text: string): string {
    const begin = text.indexOf("\\begin{document}");
    const end = text.indexOf("\\end{document}");

    if (begin === -1 || end === -1 || end <= begin) {
      return "";
    }

    return text.slice(
      begin + "\\begin{document}".length,
      end
    );
  }

  /**
   * Inicializa listeners del scanner.
   */
  initialize(): void {
    this.context.subscriptions.push(
      vscode.workspace.onDidSaveTextDocument(async doc => {
        if (!this.isLatexDocument(doc)) return;

        const mainDoc = await this.resolveMainDocument();
        if (!mainDoc) return;

        const rawMain = mainDoc.getText();
        const documentBody = this.extractDocumentBody(rawMain);

        const files = this.resolveIncludedTexFiles(mainDoc, documentBody);

        let fullText = documentBody;

        for (const filePath of files) {
          try {
            const uri = vscode.Uri.file(filePath);
            const d = await vscode.workspace.openTextDocument(uri);

            if (d.fileName === mainDoc.fileName) {
              // main body ya fue agregado
              continue;
            }

            fullText += "\n" + d.getText();
          } catch (err) {
            console.warn("[MetricScanner] No se pudo abrir:", filePath);
          }
        }


        this.tracker.processText(fullText);
        this.storage.saveState(this.tracker.getState());
        // Solicita refresh del sidebar de métricas
        vscode.commands.executeCommand("latexIS.metrics.refresh");
      })
    );
  }

  /**
   * Procesa un documento LaTeX guardado.
   */
  private processDocument(document: vscode.TextDocument): void {
    const result = this.tracker.processText(document.getText());
    this.storage.saveState(this.tracker.getState());

    // Hook futuro: refresh tree / diagnostics
    void result;
  }

  private isLatexDocument(document: vscode.TextDocument): boolean {
    return (
      document.languageId === "latex" ||
      document.fileName.toLowerCase().endsWith(".tex")
    );
  }
}
