import * as vscode from 'vscode';
import { TodoItem } from '../todoModel';

/**
 * Tree item types for the TODO sidebar.
 */
export type TodoTreeNodeType = 'file' | 'section' | 'todo';

/**
 * Backward-compatible alias used by TreeProvider.
 */
export type TodoTreeItemType = TodoTreeNodeType;

/**
 * Base tree item for the TODO TreeView.
 */
export class TodoTreeItem extends vscode.TreeItem {
  readonly type: TodoTreeNodeType;
  readonly todo?: TodoItem;
  readonly filePath?: string;
  readonly section?: string;

  constructor(options: {
    label: string;
    type: TodoTreeNodeType;
    collapsibleState: vscode.TreeItemCollapsibleState;
    filePath?: string;
    section?: string;
    todo?: TodoItem;
  }) {
    super(options.label, options.collapsibleState);

    this.type = options.type;
    this.todo = options.todo;
    this.filePath = options.filePath;
    this.section = options.section;

    this.contextValue = `latexis.todo.${options.type}`;

    // Tooltip
    if (options.todo) {
      this.tooltip = `${options.todo.text}\n${options.todo.filePath}:${options.todo.lineNumber}`;
    } else if (options.filePath) {
      this.tooltip = options.filePath;
    }

    // Description for leaf TODO nodes (line number always visible)
    if (options.type === 'todo' && options.todo) {
      this.label = options.todo.text;
      this.description = `L${options.todo.lineNumber}`;
    }

    // Command: only TODO leaf nodes are clickable
    if (options.type === 'todo' && options.todo) {
      this.command = {
        command: 'latexis.openTodoLocation',
        title: 'Open TODO',
        arguments: [options.todo]
      };
    }

    // Icons
    switch (options.type) {
      case 'file':
        this.iconPath = new vscode.ThemeIcon('file');
        break;
      case 'section':
        this.iconPath = new vscode.ThemeIcon('symbol-namespace');
        break;
      case 'todo':
        this.iconPath = new vscode.ThemeIcon('checklist');
        break;
    }
  }
}