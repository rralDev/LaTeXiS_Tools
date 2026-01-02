import * as fs from 'fs';
import * as path from 'path';

/**
 * Represents a detected chapter reference.
 */
export interface DetectedChapter {
  /**
   * Relative include path as used in \include{} or \input{}.
   * Example: "Capitulos/Figuras"
   */
  includePath: string;

  /**
   * Absolute path to the chapter file.
   */
  filePath: string;
}

/**
 * Regular expressions used to detect LaTeX include statements.
 */
const INCLUDE_PATTERN = /\\include\{([^}]+)\}/;
const INPUT_PATTERN = /\\input\{([^}]+)\}/;

/**
 * Attempts to detect the active chapter based on the currently edited file.
 *
 * Strategy (v0.2):
 * - If the active file is referenced via \include{} or \input{},
 *   the exact relative include path is used for \includeonly{}.
 * - No structural parsing of \chapter{} is performed at this stage.
 *
 * This approach is fast, robust, and works well for large thesis projects.
 */
export function detectActiveChapter(
  activeFilePath: string,
  projectRoot: string
): DetectedChapter | null {
  if (!activeFilePath.endsWith('.tex')) {
    return null;
  }

  // Normalize paths
  const normalizedActivePath = path.resolve(activeFilePath);

  // Scan all .tex files in the project root to find include/input references
  const texFiles = collectTexFiles(projectRoot);

  for (const texFile of texFiles) {
    const content = fs.readFileSync(texFile, 'utf8');
    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      const includeMatch = line.match(INCLUDE_PATTERN);
      const inputMatch = line.match(INPUT_PATTERN);

      const match = includeMatch ?? inputMatch;
      if (!match) {
        continue;
      }

      const includedPath = resolveIncludedPath(match[1], texFile);
      if (!includedPath) {
        continue;
      }

      if (includedPath === normalizedActivePath) {
        return {
          includePath: match[1],
          filePath: includedPath
        };
      }
    }
  }

  return null;
}

/**
 * Resolves the absolute path of an included LaTeX file.
 */
function resolveIncludedPath(
  includeTarget: string,
  sourceFile: string
): string | null {
  const baseDir = path.dirname(sourceFile);

  // LaTeX allows include/input with or without the .tex extension
  const withExtension = includeTarget.endsWith('.tex')
    ? includeTarget
    : includeTarget + '.tex';

  const candidate = path.resolve(baseDir, withExtension);

  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * Recursively collects all .tex files under the given directory.
 */
function collectTexFiles(
  rootPath: string,
  collected: string[] = []
): string[] {
  if (!fs.existsSync(rootPath)) {
    return collected;
  }

  const entries = fs.readdirSync(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
        continue;
      }
      collectTexFiles(fullPath, collected);
    } else if (entry.isFile() && entry.name.endsWith('.tex')) {
      collected.push(fullPath);
    }
  }

  return collected;
}