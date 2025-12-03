import * as vscode from 'vscode';

export async function ensurePackage(document: vscode.TextDocument, packageName: string) {
    const text = document.getText();
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        return;
    }

    // Check if package already exists
    const regex = new RegExp(`\\\\usepackage\\s*\\{${packageName}\\}`);
    if (regex.test(text)) {
        return;
    }

    // Find documentclass line
    const lines = text.split('\n');
    let insertLine = 0;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('\\documentclass')) {
            insertLine = i + 1;
            break;
        }
    }

    await editor.edit(editBuilder => {
        editBuilder.insert(new vscode.Position(insertLine, 0), `\\usepackage{${packageName}}\n`);
    });
}
