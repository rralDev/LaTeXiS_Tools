import * as fs from 'fs';
import * as path from 'path';
import { TodoItem, TodosByFile } from './todoModel';

/**
 * Groups TODO items by their source file.
 */
function groupTodosByFile(todos: TodoItem[]): TodosByFile[] {
  const map = new Map<string, TodoItem[]>();

  for (const todo of todos) {
    if (!map.has(todo.filePath)) {
      map.set(todo.filePath, []);
    }
    map.get(todo.filePath)!.push(todo);
  }

  return Array.from(map.entries()).map(([filePath, items]) => ({
    filePath,
    todos: items.sort((a, b) => a.lineNumber - b.lineNumber)
  }));
}

/**
 * Generates the Markdown content for TODOS.md.
 */
function generateMarkdown(
  groupedTodos: TodosByFile[],
  rootPath: string
): string {
  const lines: string[] = [];

  lines.push('# TODOs – LaTeXiS');
  lines.push('');
  lines.push(
    'This file is auto-generated. Do not edit manually.'
  );
  lines.push('');

  if (groupedTodos.length === 0) {
    lines.push('✅ No TODOs found in the project.');
    lines.push('');
    return lines.join('\n');
  }

  for (const group of groupedTodos) {
    const relativePath = path.relative(rootPath, group.filePath);

    lines.push(`## ${relativePath}`);
    lines.push('');

    for (const todo of group.todos) {
      lines.push(
        `- [ ] (line ${todo.lineNumber}) ${todo.text}`
      );
    }

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generates or regenerates the TODOS.md file at the project root.
 *
 * This function always overwrites the existing file.
 */
export async function generateTodoReport(
  todos: TodoItem[],
  rootPath: string
): Promise<void> {
  const groupedTodos = groupTodosByFile(todos);
  const markdown = generateMarkdown(groupedTodos, rootPath);

  const outputPath = path.join(rootPath, 'TODOS.md');

  fs.writeFileSync(outputPath, markdown, 'utf8');
}