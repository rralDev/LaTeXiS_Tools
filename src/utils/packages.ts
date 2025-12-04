import * as vscode from 'vscode';

export async function ensurePackage(document: vscode.TextDocument, packageName: string) {
    const text = document.getText();

    // Check if package already exists (allowing for options in brackets)
    const regex = new RegExp(`\\\\usepackage\\s*(?:\\[[^\\]]*\\])?\\s*\\{${packageName}\\}`);
    if (regex.test(text)) {
        return;
    }

    const lines = text.split('\n');
    let insertLine = 0;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('\\documentclass')) {
            insertLine = i + 1;
            break;
        }
    }

    const edit = new vscode.WorkspaceEdit();
    edit.insert(document.uri, new vscode.Position(insertLine, 0), `\\usepackage{${packageName}}\n`);
    await vscode.workspace.applyEdit(edit);
}
