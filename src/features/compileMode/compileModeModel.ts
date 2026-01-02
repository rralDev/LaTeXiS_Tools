/**
 * Models and types for LaTeXiS compilation modes.
 *
 * This file defines the minimal contracts required to support
 * different compilation strategies (normal vs draft).
 * It must NOT contain any business logic.
 */

/**
 * Available compilation modes supported by LaTeXiS.
 */
export enum CompileMode {
  /**
   * Standard compilation mode.
   * Full document, all figures, normal LaTeX behavior.
   */
  NORMAL = 'normal',

  /**
   * Draft compilation mode.
   * Optimized for speed during writing and editing.
   */
  DRAFT = 'draft'
}

/**
 * Strategy used when draft mode is enabled.
 */
export enum DraftStrategy {
  /**
   * Uses \includeonly{} to compile only the active chapter.
   */
  INCLUDE_ONLY = 'includeonly',

  /**
   * Replaces heavy elements (e.g. figures) with placeholders.
   */
  PLACEHOLDER = 'placeholder'
}

/**
 * Represents the current compilation configuration.
 */
export interface CompileModeConfig {
  /**
   * Current compilation mode.
   */
  mode: CompileMode;

  /**
   * Draft strategy applied when mode === DRAFT.
   */
  draftStrategy?: DraftStrategy;

  /**
   * Name of the active chapter (if applicable).
   * Example: "chapter1"
   */
  activeChapter?: string;
}

/**
 * Default compilation configuration.
 */
export const DEFAULT_COMPILE_MODE_CONFIG: CompileModeConfig = {
  mode: CompileMode.NORMAL
};
