import * as vscode from 'vscode';

// --------------------------------------------------
// Insertion markers (comment-based anchors)
// --------------------------------------------------
// These markers allow us to decouple insertion logic
// from concrete file names (main.tex, config.tex, etc.)

export enum InsertionTargetKind {
  PACKAGES = 'packages',
  GRAPHICS = 'graphics',
  BIBLIOGRAPHY = 'bibliography',
  METADATA = 'metadata'
}

// Default markers expected in templates (support both plain and "====" styles)
const MARKERS: Record<InsertionTargetKind, RegExp> = {
  [InsertionTargetKind.PACKAGES]: /%\s*(?:=+\s*)?packages\s+section\b\s*:?\s*$/i,
  [InsertionTargetKind.GRAPHICS]: /%\s*(?:=+\s*)?graphics\s+section\b\s*:?\s*$/i,
  [InsertionTargetKind.BIBLIOGRAPHY]: /%\s*(?:=+\s*)?bibliography\s+section\b\s*:?\s*$/i,
  [InsertionTargetKind.METADATA]: /%\s*(?:=+\s*)?metadata\s+section\b\s*:?\s*$/i
};

// --------------------------------------------------
// Resolution result
// --------------------------------------------------
export interface InsertionTarget {
  document: vscode.TextDocument;
  line: number; // line AFTER the marker
}

// --------------------------------------------------
// Public API
// --------------------------------------------------

/**
 * Resolves the best insertion target for a given kind.
 * Priority:
 *  1) config.tex (if present) and marker exists
 *  2) main.tex (documentclass file) and marker exists
 *  3) config.tex (fallback: top of file)
 *  4) main.tex (fallback: after last \\usepackage)
 */
export async function resolveInsertionTarget(
  kind: InsertionTargetKind,
  mainDocument: vscode.TextDocument
): Promise<InsertionTarget> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // Helper: try a document for a marker
  const tryMarker = (doc: vscode.TextDocument): InsertionTarget | null => {
    const lines = doc.getText().split('\n');
    const marker = MARKERS[kind];

    for (let i = 0; i < lines.length; i++) {
      if (marker.test(lines[i])) {
        // Insert after the marker line and its visual separators (but do NOT skip arbitrary comments)
        let line = i + 1;

        while (line < lines.length) {
          const t = lines[line].trim();
          if (t === '') {
            line++;
            continue;
          }

          // Skip only the decorative separator lines like "%=====..."
          if (/^%\s*=+/.test(t)) {
            line++;
            continue;
          }

          break;
        }

        return { document: doc, line: i };
      }
    }

    return null;
  };

  // 1) Try config.tex with marker
  if (workspaceFolders && workspaceFolders.length > 0) {
    const root = workspaceFolders[0].uri;
    const configUri = vscode.Uri.joinPath(root, 'config.tex');
    try {
      const configDoc = await vscode.workspace.openTextDocument(configUri);
      const hit = tryMarker(configDoc);
      if (hit) return hit;
    } catch {
      // ignore
    }
  }

  // 2) Try main document with marker
  const hitMain = tryMarker(mainDocument);
  if (hitMain) return hitMain;

  // 3) Fallback to config.tex top
  if (workspaceFolders && workspaceFolders.length > 0) {
    const root = workspaceFolders[0].uri;
    const configUri = vscode.Uri.joinPath(root, 'config.tex');
    try {
      const configDoc = await vscode.workspace.openTextDocument(configUri);
      return { document: configDoc, line: 0 };
    } catch {
      // ignore
    }
  }

  // 4) Fallback to main document after last \usepackage
  const lines = mainDocument.getText().split('\n');
  let insertLine = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('\\usepackage')) {
      insertLine = i + 1;
    }
  }

  return { document: mainDocument, line: insertLine };
}

/**
 * Backward-compatible alias used by utils (packages, graphics, etc.).
 * This avoids tight coupling to resolver naming.
 */
export async function findInsertionTarget(
  kind: InsertionTargetKind,
  mainDocument: vscode.TextDocument
): Promise<InsertionTarget> {
  return resolveInsertionTarget(kind, mainDocument);
}