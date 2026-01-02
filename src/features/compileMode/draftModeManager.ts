import * as fs from 'fs';
import * as path from 'path';
import {
  CompileMode,
  CompileModeConfig,
  DraftStrategy,
  DEFAULT_COMPILE_MODE_CONFIG
} from './compileModeModel';
import { detectActiveChapter } from './chapterDetector';

/**
 * Manages the activation and deactivation of LaTeXiS draft compilation mode.
 *
 * Responsibilities:
 * - Decide whether draft mode can be enabled.
 * - Inject or remove \\includeonly{} directives.
 * - Keep changes reversible and minimal.
 *
 * This manager does NOT:
 * - Trigger compilation.
 * - Interact with VS Code APIs.
 * - Persist configuration beyond the project files.
 */
export class DraftModeManager {
  private config: CompileModeConfig = {
    ...DEFAULT_COMPILE_MODE_CONFIG
  };

  /**
   * Enables draft compilation mode.
   *
   * Strategy (v0.2):
   * - Detect the active chapter using include/input relationships.
   * - Inject \\includeonly{<chapter>} into the main LaTeX file.
   * - Fallback safely if no chapter can be detected.
   */
  enableDraftMode(
    projectRoot: string,
    activeFilePath: string,
    mainTexPath: string
  ): CompileModeConfig {
    const detectedChapter = detectActiveChapter(
      activeFilePath,
      projectRoot
    );

    if (!detectedChapter) {
      // Cannot determine a safe draft mode configuration
      return this.config;
    }

    this.applyIncludeOnly(
      mainTexPath,
      detectedChapter.includePath
    );

    this.config = {
      mode: CompileMode.DRAFT,
      draftStrategy: DraftStrategy.INCLUDE_ONLY,
      activeChapter: detectedChapter.includePath
    };

    return this.config;
  }

  /**
   * Disables draft compilation mode and restores normal compilation.
   *
   * This removes any previously injected \\includeonly{} directive.
   */
  disableDraftMode(
    mainTexPath: string
  ): CompileModeConfig {
    this.removeIncludeOnly(mainTexPath);

    this.config = {
      mode: CompileMode.NORMAL
    };

    return this.config;
  }

  /**
   * Returns the current compilation configuration.
   */
  getCurrentConfig(): CompileModeConfig {
    return this.config;
  }

  /**
   * Injects a \\includeonly{} directive into the main LaTeX file.
   *
   * The directive is inserted near the top of the file,
   * after \\documentclass if present.
   */
  private applyIncludeOnly(
    mainTexPath: string,
    includePath: string
  ): void {
    if (!fs.existsSync(mainTexPath)) {
      return;
    }

    const content = fs.readFileSync(mainTexPath, 'utf8');
    const lines = content.split(/\r?\n/);

    // Remove any existing includeonly directive first
    const filteredLines = lines.filter(
      line => !line.trim().startsWith('\\includeonly')
    );

    const includeOnlyLine = `\\includeonly{${includePath}}`;

    let inserted = false;
    const outputLines: string[] = [];

    for (const line of filteredLines) {
      outputLines.push(line);

      if (
        !inserted &&
        line.trim().startsWith('\\documentclass')
      ) {
        outputLines.push(includeOnlyLine);
        inserted = true;
      }
    }

    // If no documentclass was found, prepend includeonly
    if (!inserted) {
      outputLines.unshift(includeOnlyLine);
    }

    fs.writeFileSync(
      mainTexPath,
      outputLines.join('\n'),
      'utf8'
    );
  }

  /**
   * Removes any \\includeonly{} directive from the main LaTeX file.
   */
  private removeIncludeOnly(
    mainTexPath: string
  ): void {
    if (!fs.existsSync(mainTexPath)) {
      return;
    }

    const content = fs.readFileSync(mainTexPath, 'utf8');
    const lines = content.split(/\r?\n/);

    const cleanedLines = lines.filter(
      line => !line.trim().startsWith('\\includeonly')
    );

    fs.writeFileSync(
      mainTexPath,
      cleanedLines.join('\n'),
      'utf8'
    );
  }
}