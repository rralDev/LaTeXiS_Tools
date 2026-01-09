import * as fs from 'fs';
import * as path from 'path';
import {
  TodoItem,
  TodoScanOptions,
  DEFAULT_TODO_PATTERN
} from '../todos/todoModel';

/**
 * Recursively scans a directory and returns all files
 * matching the allowed extensions.
 */
function collectFiles(
  dirPath: string,
  extensions: string[],
  collected: string[] = []
): string[] {
  if (!fs.existsSync(dirPath)) {
    return collected;
  }

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      // Skip common folders that should not be scanned
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      collectFiles(fullPath, extensions, collected);
    } else if (entry.isFile()) {
      if (extensions.includes(path.extname(entry.name))) {
        collected.push(fullPath);
      }
    }
  }

  return collected;
}

/**
 * Scans a LaTeX project for embedded TODO comments.
 *
 * Input:
 *  - rootPath: root directory of the workspace
 *
 * Output:
 *  - Array of TodoItem objects
 *
 * This function:
 *  - reads files synchronously
 *  - does NOT modify files
 *  - does NOT depend on VS Code APIs
 */
export async function scanTodos(
  rootPath: string,
  options: TodoScanOptions = {}
): Promise<TodoItem[]> {
  const patterns = options.patterns ?? [DEFAULT_TODO_PATTERN];
  const fileExtensions = options.fileExtensions ?? ['.tex'];

  const todoItems: TodoItem[] = [];

  const files = collectFiles(rootPath, fileExtensions);

  for (const filePath of files) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split(/\r?\n/);

    let currentHierarchy: {
      chapter?: string;
      section?: string;
      subsection?: string;
      subsubsection?: string;
    } = {};

    lines.forEach((line, index) => {
      const chapterMatch = line.match(/\\chapter\{(.+?)\}/);
      if (chapterMatch) {
        currentHierarchy.chapter = chapterMatch[1].trim();
        currentHierarchy.section = undefined;
        currentHierarchy.subsection = undefined;
        currentHierarchy.subsubsection = undefined;
      }

      const sectionMatch = line.match(/\\section\{(.+?)\}/);
      if (sectionMatch) {
        currentHierarchy.section = sectionMatch[1].trim();
        currentHierarchy.subsection = undefined;
        currentHierarchy.subsubsection = undefined;
      }

      const subsectionMatch = line.match(/\\subsection\{(.+?)\}/);
      if (subsectionMatch) {
        currentHierarchy.subsection = subsectionMatch[1].trim();
        currentHierarchy.subsubsection = undefined;
      }

      const subsubsectionMatch = line.match(/\\subsubsection\{(.+?)\}/);
      if (subsubsectionMatch) {
        currentHierarchy.subsubsection = subsubsectionMatch[1].trim();
      }

      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
          todoItems.push({
            filePath,
            lineNumber: index + 1,
            text: match[1].trim(),
            chapter: currentHierarchy.chapter,
            section: currentHierarchy.section,
            subsection: currentHierarchy.subsection,
            subsubsection: currentHierarchy.subsubsection
          });
          break;
        }
      }
    });
  }

  return todoItems;
}