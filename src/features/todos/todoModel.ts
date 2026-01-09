/**
 * Data model for managing TODOs embedded in LaTeX documents.
 * This file defines only types and interfaces.
 * Should NOT contain business logic or VS Code dependencies.
 */

/**
 * Default pattern to detect ALLs in LaTeX comments.
 * Expected example:
 * % ALL: describe methodology
 */
export const DEFAULT_TODO_PATTERN = /%\s*TODO\s*:\s*(.+)$/i;

/**
 * Represents a TODO detected in the project.
 */
export interface TodoItem {
  /**
   * Absolute or relative path of the file where the TODO was detected.
   */
  filePath: string;

  /**
   * Line number (1-based) where the TODO appears.
   */
  lineNumber: number;

  /**
   * Text of the TODO (without the "% TODO:" prefix).
   */
  text: string;

  /**
   * Nearest LaTeX structural context (if available)
   */
  chapter?: string;
  section?: string;
  subsection?: string;
  subsubsection?: string;
}

/**
 * Represents a set of TODOs grouped by file.
 * Useful for generating reports.
 */
export interface TodosByFile {
  filePath: string;
  todos: TodoItem[];
}

/**
 * Opciones de configuración para el escaneo de TODOs.
 * Pensado para extensiones futuras.
 */
export interface TodoScanOptions {
  /**
   * Patrones de TODO permitidos.
   * Por defecto: [% TODO:]
   */
  patterns?: RegExp[];

  /**
   * Extensiones de archivo a escanear.
   * Por defecto: ['.tex']
   */
  fileExtensions?: string[];
}