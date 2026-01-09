import * as vscode from "vscode";
import { TodoTreeProvider } from "./todoTreeProvider";
import { TodoItem } from "../todoModel";

/**
 * Registers commands related to the TODO TreeView.
 */
export function registerTodoTreeCommand(
  context: vscode.ExtensionContext,
  provider: TodoTreeProvider
): void {
  // Refresh command
  context.subscriptions.push(
    vscode.commands.registerCommand("latexis.todos.refresh", () => {
      provider.refresh();
    })
  );

  // Open TODO location command (used by tree items)
  context.subscriptions.push(
    vscode.commands.registerCommand(
      "latexis.openTodoLocation",
      async (todo: TodoItem) => {
        const uri = vscode.Uri.file(todo.filePath);

        // Try to find an already opened editor for this file
        let editor = vscode.window.visibleTextEditors.find(
          e => e.document.uri.fsPath === todo.filePath
        );

        if (!editor) {
          const doc = await vscode.workspace.openTextDocument(uri);
          editor = await vscode.window.showTextDocument(doc, {
            viewColumn: vscode.ViewColumn.One,
            preview: false,
            preserveFocus: false,
          });
        } else {
          await vscode.window.showTextDocument(editor.document, {
            viewColumn: vscode.ViewColumn.One,
            preserveFocus: false,
          });
        }

        const position = new vscode.Position(
          Math.max(todo.lineNumber - 1, 0),
          0
        );

        editor.selection = new vscode.Selection(position, position);
        editor.revealRange(
          new vscode.Range(position, position),
          vscode.TextEditorRevealType.InCenter
        );
      }
    )
  );
}