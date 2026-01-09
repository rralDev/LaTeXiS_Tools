import * as vscode from 'vscode';
import * as path from 'path';
import { scanTodos } from '../features/todos/todoScanner';
import { generateTodoReport } from '../features/todos/todoReporter';

/**
 * Command entry point for generating the TODOS.md file.
 */
export async function listTodos(): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage('LaTeXiS: No workspace folder is open.');
      return;
    }

    const rootPath = workspaceFolders[0].uri.fsPath;

    // Scan project for TODOs
    const todos = await scanTodos(rootPath);

    // Generate TODOS.md
    await generateTodoReport(todos, rootPath);

    const outputPath = path.join(rootPath, 'TODOS.md');

    if (todos.length === 0) {
      vscode.window.showInformationMessage('LaTeXiS: No TODOs found. TODOS.md was updated.');
    } else {
      vscode.window.showInformationMessage(`LaTeXiS: ${todos.length} TODO(s) found. TODOS.md generated.`);
    }

    const doc = await vscode.workspace.openTextDocument(outputPath);
    await vscode.window.showTextDocument(doc, {
      preview: true,
      viewColumn: vscode.ViewColumn.Beside,
      preserveFocus: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    vscode.window.showErrorMessage(`LaTeXiS: Failed to generate TODOs. ${message}`);
  }
}