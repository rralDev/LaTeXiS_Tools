import * as vscode from 'vscode';

export async function findPackageTargetDocument(
  mainDocument: vscode.TextDocument
): Promise<vscode.TextDocument> {

  // 1) Directory of main document
  const mainDir = mainDocument.uri.with({
    path: mainDocument.uri.path.replace(/[^/]+$/, "")
  });

  // Try config.tex next to main.tex
  const localConfig = vscode.Uri.joinPath(mainDir, 'config.tex');
  try {
    return await vscode.workspace.openTextDocument(localConfig);
  } catch {
    // continue
  }

  // 2) Workspace root fallback
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const rootConfig = vscode.Uri.joinPath(workspaceFolders[0].uri, 'config.tex');
    try {
      return await vscode.workspace.openTextDocument(rootConfig);
    } catch {
      // continue
    }
  }

  // 3) Final fallback: main document
  vscode.window.showWarningMessage(
    'LaTeXiS: No se encontró config.tex. Los paquetes se insertarán en el archivo principal.'
  );
  return mainDocument;
}

export async function findMainTexDocument(
  activeDocument: vscode.TextDocument
): Promise<vscode.TextDocument> {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  // 1) Check user setting latexis.mainFile (if provided)
  const config = vscode.workspace.getConfiguration('latexis');
  const mainFileSetting = config.get<string>('mainFile');

  if (mainFileSetting && workspaceFolders && workspaceFolders.length > 0) {
    const root = workspaceFolders[0].uri;
    const mainUri = vscode.Uri.joinPath(root, mainFileSetting);
    try {
      return await vscode.workspace.openTextDocument(mainUri);
    } catch {
      // fall through to other strategies
    }
  }

  // 2) If the active document contains \documentclass, treat it as the main file
  const activeText = activeDocument.getText();
  if (/^\s*\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/m.test(activeText)) {
    return activeDocument;
  }

  // 3) Search workspace for a .tex file containing \documentclass
  if (workspaceFolders && workspaceFolders.length > 0) {
    const texFiles = await vscode.workspace.findFiles('**/*.tex');
    for (const uri of texFiles) {
      const doc = await vscode.workspace.openTextDocument(uri);
      const text = doc.getText();
      if (/^\s*\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/m.test(text)) {
        return doc;
      }
    }
  }

  // 4) Fallback: return the active document
  return activeDocument;
}

export async function ensurePrintBibliography(
  mainDocument: vscode.TextDocument
): Promise<void> {
  const text = mainDocument.getText();

  // Do nothing if already present
  if (/\\printbibliography\b/.test(text)) {
    return;
  }

  const lines = text.split('\n');
  let insertLine = -1;

  for (let i = 0; i < lines.length; i++) {
    if (/\\end\{document\}/.test(lines[i])) {
      insertLine = i;
      break;
    }
  }

  if (insertLine === -1) {
    return;
  }

  const finalLines = [
    ...lines.slice(0, insertLine),
    '\\printbibliography',
    ...lines.slice(insertLine)
  ];

  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    mainDocument.uri,
    new vscode.Range(0, 0, mainDocument.lineCount, 0),
    finalLines.join('\n')
  );

  await vscode.workspace.applyEdit(edit);
}