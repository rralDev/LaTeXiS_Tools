import * as vscode from 'vscode';
import * as path from 'path';
import { scanTodos } from '../features/todos/todoScanner';
import { generateTodoReport } from '../features/todos/todoReporter';

/**
 * Command entry point for generating the TODOS.md file.
 *
 * This command:
 * - determines the workspace root
 * - scans all LaTeX files for TODO comments
 * - generates (or regenerates) TODOS.md
 * - provides user feedback
 */
export async function listTodos(): Promise<void> {
  try {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage(
        'LaTeXiS: No workspace folder is open.'
      );
      return;
    }

    // Use the first workspace folder as the project root
    const rootPath = workspaceFolders[0].uri.fsPath;

    // Scan project for TODOs
    const todos = await scanTodos(rootPath);

    // Generate TODOS.md
    await generateTodoReport(todos, rootPath);

    const relativePath = path.join(rootPath, 'TODOS.md');

    if (todos.length === 0) {
      vscode.window.showInformationMessage(
        'LaTeXiS: No TODOs found. TODOS.md was updated.'
      );
    } else {
      vscode.window.showInformationMessage(
        `LaTeXiS: ${todos.length} TODO(s) found. TODOS.md generated.`
      );
    }

    // Optionally open the generated file
    const doc = await vscode.workspace.openTextDocument(relativePath);
    await vscode.window.showTextDocument(doc, { preview: false });

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    vscode.window.showErrorMessage(
      `LaTeXiS: Failed to generate TODOs. ${message}`
    );
  }
}
