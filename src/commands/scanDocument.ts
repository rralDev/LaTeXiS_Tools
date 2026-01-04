import * as vscode from 'vscode';
import { ensurePackage } from '../utils/packages';
import { findMainTexDocument, findPackageTargetDocument } from '../utils/latexDocuments';
import {
  detectFigurePackages,
  detectTablePackages,
  detectMathPackages,
  detectReferencePackages,
  detectTextPackages
} from '../detections';

export function registerScanDocument(context: vscode.ExtensionContext) {
  const scanDocument = vscode.commands.registerCommand('latexis.scanDocument', async () => {

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage("No hay un editor activo.");
      return;
    }

    const activeDocument = editor.document;
    const activeText = activeDocument.getText();
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders) {
      if (!activeText.includes("\\documentclass")) {
        vscode.window.showWarningMessage(
          "Este archivo no contiene \\\\documentclass. Abre la carpeta de tu proyecto para analizar múltiples archivos."
        );
        return;
      }
    }

    const mainDocument = await findMainTexDocument(activeDocument);
    const targetDocument = await findPackageTargetDocument(mainDocument);
    const mainText = mainDocument.getText();

    if (workspaceFolders && !mainText.includes("\\documentclass")) {
      vscode.window.showWarningMessage(
        "No se encontró el archivo principal con \\\\documentclass en este proyecto."
      );
      return;
    }

    let allText = activeText;

    if (workspaceFolders && workspaceFolders.length > 0) {
      const texFiles = await vscode.workspace.findFiles('**/*.tex');
      for (const uri of texFiles) {
        const doc = await vscode.workspace.openTextDocument(uri);
        if (doc !== activeDocument) {
          allText += '\\n' + doc.getText();
        }
      }
    }

    const detected = new Set<string>();

    for (const detector of [
      detectFigurePackages,
      detectTablePackages,
      detectMathPackages,
      detectReferencePackages,
      detectTextPackages
    ]) {
      detector(allText).forEach(pkg => detected.add(pkg));
    }

    const targetTextNow = targetDocument.getText();
    const newlyAdded: string[] = [];

    for (const pkg of detected) {
      const regex = new RegExp(`\\\\usepackage\\\\s*(?:\\\\[[^\\\\]]*\\\\])?\\\\s*\\\\{${pkg}\\\\}`);
      if (!regex.test(targetTextNow)) {
        await ensurePackage(targetDocument, pkg);
        newlyAdded.push(pkg);
      }
    }

    if (newlyAdded.length === 0) {
      vscode.window.showInformationMessage("No se añadieron nuevos paquetes. Todo está completo.");
    } else {
      vscode.window.showInformationMessage(
        "Nuevos paquetes añadidos al archivo de configuración: " + newlyAdded.join(", ")
      );
    }
  });

  context.subscriptions.push(scanDocument);
}