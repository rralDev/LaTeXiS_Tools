import * as fs from 'fs';
import * as path from 'path';
import { TodoItem, TodosByFile } from './todoModel';

function generateMarkdown(
  groupedTodos: TodosByFile[],
  rootPath: string
): string {
  const lines: string[] = [];

  lines.push('# TODOs – LaTeXiS');
  lines.push('');
  lines.push('This file is auto-generated. Do not edit manually.');
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

    const todosWithSection: TodoItem[] = [];
    const todosWithoutSection: TodoItem[] = [];

    for (const todo of group.todos) {
      if (todo.section) {
        todosWithSection.push(todo);
      } else {
        todosWithoutSection.push(todo);
      }
    }

    todosWithoutSection.sort((a, b) => a.lineNumber - b.lineNumber);

    for (const todo of todosWithoutSection) {
      lines.push(`- Line ${todo.lineNumber}: ${todo.text}`);
    }

    if (todosWithoutSection.length > 0) {
      lines.push('');
    }

    const sectionMap = new Map<string, TodoItem[]>();

    for (const todo of todosWithSection) {
      const sectionName = todo.section!;
      if (!sectionMap.has(sectionName)) {
        sectionMap.set(sectionName, []);
      }
      sectionMap.get(sectionName)!.push(todo);
    }

    for (const [section, todos] of sectionMap.entries()) {
      todos.sort((a, b) => a.lineNumber - b.lineNumber);

      lines.push(`### section/${section}`);
      lines.push('');

      for (const todo of todos) {
        lines.push(`- Line ${todo.lineNumber}: ${todo.text}`);
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

export async function generateTodoReport(
  todos: TodoItem[],
  rootPath: string
): Promise<void> {
  const groupedTodos: TodosByFile[] = [];

  const map = new Map<string, TodoItem[]>();
  for (const todo of todos) {
    if (!map.has(todo.filePath)) {
      map.set(todo.filePath, []);
    }
    map.get(todo.filePath)!.push(todo);
  }

  for (const [filePath, items] of map.entries()) {
    groupedTodos.push({
      filePath,
      todos: items.sort((a, b) => a.lineNumber - b.lineNumber),
    });
  }

  const markdown = generateMarkdown(groupedTodos, rootPath);
  const outputPath = path.join(rootPath, 'TODOS.md');

  fs.writeFileSync(outputPath, markdown, 'utf8');
}