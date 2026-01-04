import * as vscode from 'vscode';
import {
  InsertionTargetKind,
  findInsertionTarget
} from './latexInsertionTargets';

/**
 * Ensures that a LaTeX package is declared exactly once
 * in the appropriate insertion target (usually config.tex).
 */
export async function ensurePackage(
  mainDocument: vscode.TextDocument,
  packageName: string,
  options?: string
): Promise<void> {
  const pkgLine = options
    ? `\\usepackage[${options}]{${packageName}}`
    : `\\usepackage{${packageName}}`;

  const target = await findInsertionTarget(
    InsertionTargetKind.PACKAGES,
    mainDocument
  );

  const text = target.document.getText();

  // Do not insert if already present
  const pkgRegex = new RegExp(
    `\\\\usepackage(\\[[^\\]]*\\])?\\{${packageName}\\}`
  );
  if (pkgRegex.test(text)) {
    return;
  }

  // Insert AFTER the packages section marker, accumulating packages downward
  let insertLine = target.line + 2;

  for (let i = insertLine; i < target.document.lineCount; i++) {
    const line = target.document.lineAt(i).text;

    // Stop if another section begins
    if (/%\s*=+/.test(line)) {
      break;
    }

    // Append after existing packages
    if (/^\\usepackage/.test(line)) {
      insertLine = i + 1;
    }
  }

  const edit = new vscode.WorkspaceEdit();
  edit.insert(
    target.document.uri,
    new vscode.Position(insertLine, 0),
    pkgLine + '\n'
  );

  await vscode.workspace.applyEdit(edit);
}
