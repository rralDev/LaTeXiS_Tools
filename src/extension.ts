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

import { findMainTexDocument } from "./utils/latexDocuments";

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
