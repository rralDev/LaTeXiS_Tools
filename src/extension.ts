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

import { TodoTreeProvider } from "./features/todos/tree/todoTreeProvider";
import { registerTodoTreeCommand } from "./features/todos/tree/todoTreeCommand";

import { MetricScanner } from "./features/metrics/scanner/metricScanner";
import { TrackerStorage } from "./features/metrics/tracker/trackerStorage";
import { MetricTreeProvider } from "./features/metrics/tree/metricTreeProvider";
import { showMetricsCommand } from "./features/metrics/commands/showMetrics";
import { resetMetricsCommand } from "./features/metrics/commands/resetMetrics";

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


  // -------------------------------
  // TODOs: Sidebar Tree View
  // Provides a persistent, clickable TODO explorer
  // (file → section → TODO)
  // -------------------------------
  // TODOs: Tree View (Sidebar)
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootPath = workspaceFolders[0].uri.fsPath;

    const todoTreeProvider = new TodoTreeProvider(rootPath);
    const todoTreeDisposable = vscode.window.registerTreeDataProvider(
      "latexisTodosView",
      todoTreeProvider
    );

    context.subscriptions.push(todoTreeDisposable);
    registerTodoTreeCommand(context, todoTreeProvider);
  }

  // -------------------------------
  // Writing Metrics: Tracker + Tree View
  // -------------------------------
  const metricsStorage = new TrackerStorage(context.workspaceState);

  const metricTreeProvider = new MetricTreeProvider(metricsStorage);
  const metricTreeDisposable = vscode.window.registerTreeDataProvider(
    "latexisMetricsView",
    metricTreeProvider
  );
  context.subscriptions.push(metricTreeDisposable);

  const metricScanner = new MetricScanner(
    context,
    metricsStorage
  );

  metricScanner.initialize();

  context.subscriptions.push(showMetricsCommand(context));
  context.subscriptions.push(resetMetricsCommand(context));

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
