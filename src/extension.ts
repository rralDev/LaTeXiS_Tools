// VS Code API imports
import * as vscode from "vscode";

import { pasteSimpleTable } from "./features/tableFromClipboard/pasteSimpleTable";
import { insertExcelTable } from "./features/tableFromExcel/insertExcelTable";
import { registerManageTables } from "./commands/manageTables";

import { registerInsertFigure } from "./commands/insertFigure";
import { registerInsertEquation } from "./commands/insertEquation";
import { registerScanDocument } from "./commands/scanDocument";
import { registerInsertAPAConfig } from "./commands/insertAPAConfig";
import { registerChangeCitationStyle } from "./commands/changeCitationStyle";
import { registerInitialSetup } from "./commands/initialSetup";
import { listTodos } from "./commands/listTodos";
import { toggleDraftMode } from "./commands/toggleDraftMode";

import { registerManageReferences } from "./commands/manageReferences";

import { registerInsertFromDOI } from "./features/bibliography/commands/insertFromDOI";
import { registerInsertFromTitle } from "./features/bibliography/commands/insertFromTitle";
import { registerManageBibliography } from "./features/bibliography/commands/manageBibliography";
import { createAcademicProject } from "./features/scaffolding/commands/createAcademicProject";

export async function findMainTexDocument(activeDocument: vscode.TextDocument): Promise<vscode.TextDocument> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    // 1) Check user setting latexis.mainFile (if provided)
    const config = vscode.workspace.getConfiguration('latexis');
    const mainFileSetting = config.get<string>('mainFile');

    if (mainFileSetting && workspaceFolders && workspaceFolders.length > 0) {
        const root = workspaceFolders[0].uri;
        const mainUri = vscode.Uri.joinPath(root, mainFileSetting);
        try {
            return await vscode.workspace.openTextDocument(mainUri);
        } catch {
            // fall through to other strategies
        }
    }

    // 2) If the active document contains \documentclass, treat it as the main file
    const activeText = activeDocument.getText();
    if (/^\s*\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/m.test(activeText)) {
        return activeDocument;
    }

    // 3) Search workspace for a .tex file containing \documentclass
    if (workspaceFolders && workspaceFolders.length > 0) {
        const texFiles = await vscode.workspace.findFiles('**/*.tex');
        for (const uri of texFiles) {
            const doc = await vscode.workspace.openTextDocument(uri);
            const text = doc.getText();
            if (/^\s*\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/m.test(text)) {
                return doc;
            }
        }
    }

    // Fallback: return the active document
    return activeDocument;
}

// LaTeXiS Extension Activation — Registers commands and initializes extension behavior
export function activate(context: vscode.ExtensionContext) {
  // 1) Command modules
  registerInsertFigure(context);
  registerInsertEquation(context);
  registerInsertAPAConfig(context);
  registerChangeCitationStyle(context);
  registerScanDocument(context);
  registerInitialSetup(context);

  // Bibliography / References (new unified menu)
  registerManageReferences(context);
  registerInsertFromDOI(context);
  registerInsertFromTitle(context);
  registerManageTables(context);

  // Table commands (actual implementations)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "latexis.insertExcelTable",
      insertExcelTable
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "latexis.pasteSimpleTable",
      pasteSimpleTable
    )
  );

  // TODOs: generate TODOS.md from embedded % TODO: comments
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "latexis.listTodos",
      listTodos
    )
  );

  // Draft mode: toggle fast compilation using includeonly
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "latexis.toggleDraftMode",
      toggleDraftMode
    )
  );

  // Academic project scaffolding
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "latexis.createAcademicProject",
      createAcademicProject
    )
  );

  // 2) Basic example command
  const disposable = vscode.commands.registerCommand("latexis.helloWorld", () => {
    vscode.window.showInformationMessage("Hello World from LaTeXiS!");
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
