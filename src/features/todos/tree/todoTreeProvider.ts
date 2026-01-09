import * as vscode from "vscode";
import * as path from "path";
import { TodoItem } from "../todoModel";
import { scanTodos } from "../todoScanner";
import { TodoTreeItem } from "./todoTreeItem";

export class TodoTreeProvider implements vscode.TreeDataProvider<TodoTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<TodoTreeItem | undefined>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private todos: TodoItem[] = [];
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = rootPath;
    this.refresh();

    vscode.workspace.onDidSaveTextDocument(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this.loadTodos();
  }

  private async loadTodos(): Promise<void> {
    this.todos = await scanTodos(this.rootPath);
    this._onDidChangeTreeData.fire(undefined);
  }

  getTreeItem(element: TodoTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TodoTreeItem): Thenable<TodoTreeItem[]> {
    if (!element) {
      return Promise.resolve(this.buildFileNodes());
    }

    if (element.type === 'file') {
      return Promise.resolve(this.buildSectionNodes(element));
    }

    if (element.type === 'section') {
      return Promise.resolve(this.buildTodoNodes(element));
    }

    return Promise.resolve([]);
  }

  private buildFileNodes(): TodoTreeItem[] {
    const files = new Map<string, TodoItem[]>();

    for (const todo of this.todos) {
      if (!files.has(todo.filePath)) {
        files.set(todo.filePath, []);
      }
      files.get(todo.filePath)!.push(todo);
    }

    return Array.from(files.entries()).map(([filePath, todos]) => {
      const count = todos.length;
      const label = `${path.relative(this.rootPath, filePath)} (${count})`;
      return new TodoTreeItem({
        label,
        type: 'file',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        filePath
      });
    });
  }

  private buildSectionNodes(fileNode: TodoTreeItem): TodoTreeItem[] {
    const todos = this.todos.filter(todo => todo.filePath === fileNode.filePath);
    const sections = new Map<string, TodoItem[]>();

    for (const todo of todos) {
      let sectionLabel = "Documento (sin sección)";

      if (todo.chapter) {
        sectionLabel = `Chapter: ${todo.chapter}`;
      }
      if (todo.section) {
        sectionLabel = `Sec: ${todo.section}`;
      }
      if (todo.subsection) {
        sectionLabel = `SubSec: ${todo.subsection}`;
      }
      if (todo.subsubsection) {
        sectionLabel = `SubSubSec: ${todo.subsubsection}`;
      }
      if (!sections.has(sectionLabel)) {
        sections.set(sectionLabel, []);
      }
      sections.get(sectionLabel)!.push(todo);
    }

    return Array.from(sections.entries()).map(([sectionLabel, todos]) => {
      const count = todos.length;
      return new TodoTreeItem({
        label: `${sectionLabel} (${count})`,
        type: 'section',
        collapsibleState: vscode.TreeItemCollapsibleState.Expanded,
        filePath: fileNode.filePath,
        section: sectionLabel
      });
    });
  }

  private buildTodoNodes(sectionNode: TodoTreeItem): TodoTreeItem[] {
    const todos = this.todos.filter(todo => todo.filePath === sectionNode.filePath && (
      todo.subsubsection
        ? `SubSubSec: ${todo.subsubsection}`
        : todo.subsection
        ? `SubSec: ${todo.subsection}`
        : todo.section
        ? `Sec: ${todo.section}`
        : todo.chapter
        ? `Chapter: ${todo.chapter}`
        : "Documento (sin sección)"
    ) === sectionNode.section);

    return todos
      .sort((a, b) => a.lineNumber - b.lineNumber)
      .map(todo => {
        const label = `${todo.text}`;
        return new TodoTreeItem({
          label,
          type: 'todo',
          collapsibleState: vscode.TreeItemCollapsibleState.None,
          todo
        });
      });
  }
}