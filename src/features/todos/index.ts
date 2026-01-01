/****
 * Barrel export for the TODOs feature.
 *
 * This file centralizes all public exports related to
 * embedded TODO management, so other layers (commands,
 * future features, tests) can import from a single path.
 *
 * IMPORTANT:
 * - Do NOT put logic here.
 * - Do NOT import VS Code APIs here.
 */

export { scanTodos } from './todoScanner';
export { generateTodoReport } from './todoReporter';

export type {
  TodoItem,
  TodosByFile,
  TodoScanOptions
} from './todoModel';

export { DEFAULT_TODO_PATTERN } from './todoModel';
