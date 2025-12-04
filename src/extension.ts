// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ensurePackage } from './utils/packages';

async function findMainTexDocument(activeDocument: vscode.TextDocument): Promise<vscode.TextDocument> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    // 1) Check user setting latexis.mainFile if present
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

    // 2) If active document has a documentclass, assume it is main
    const activeText = activeDocument.getText();
    if (activeText.includes('\\documentclass')) {
        return activeDocument;
    }

    // 3) Search for any .tex file with a documentclass
    if (workspaceFolders && workspaceFolders.length > 0) {
        const texFiles = await vscode.workspace.findFiles('**/*.tex');
        for (const uri of texFiles) {
            const doc = await vscode.workspace.openTextDocument(uri);
            const text = doc.getText();
            if (text.includes('\\documentclass')) {
                return doc;
            }
        }
    }

    // Fallback: use active document
    return activeDocument;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "latexis" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	const disposable = vscode.commands.registerCommand('latexis.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		vscode.window.showInformationMessage('Hello World from LaTeXiS!');
	});

    // Register Insert Figure command
    let insertFigure = vscode.commands.registerCommand('latexis.insertFigure', async () => {

        const opciones = [
            "Insertar figura completa (entorno figure)",
            "Insertar solo \\includegraphics",
            "Insertar figura alineada a la derecha (wrapfigure)",
            "Insertar figura alineada a la izquierda (wrapfigure)"
        ];

        const seleccion = await vscode.window.showQuickPick(opciones, {
            placeHolder: "Selecciona el tipo de figura que deseas insertar"
        });

        if (!seleccion) {
            return; // Usuario canceló
        }

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No hay un editor activo.");
            return;
        }

        let snippet = "";

        switch (seleccion) {
            case opciones[0]:
                await ensurePackage(editor.document, "graphicx");
                snippet =
`\\begin{figure}[hbtp]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{}
    \\caption{}
    \\label{fig:}
\\end{figure}
`;
                break;

            case opciones[1]:
                await ensurePackage(editor.document, "graphicx");
                snippet = "\\includegraphics[width=0.8\\textwidth]{}";
                break;

            case opciones[2]:
                await ensurePackage(editor.document, "wrapfig");
                await ensurePackage(editor.document, "graphicx");
                snippet =
`\\begin{wrapfigure}{r}{0.4\\textwidth}
    \\centering
    \\includegraphics[width=0.95\\linewidth]{}
    \\caption{}
    \\label{fig:}
\\end{wrapfigure}
`;
                break;

            case opciones[3]:
                await ensurePackage(editor.document, "wrapfig");
                await ensurePackage(editor.document, "graphicx");
                snippet =
`\\begin{wrapfigure}{l}{0.4\\textwidth}
    \\centering
    \\includegraphics[width=0.95\\linewidth]{}
    \\caption{}
    \\label{fig:}
\\end{wrapfigure}
`;
                break;
        }

        editor.insertSnippet(new vscode.SnippetString(snippet));
    });

    // Register Insert Equation command
    let insertEquation = vscode.commands.registerCommand('latexis.insertEquation', async () => {

        const opcionesEcuacion = [
            "Ecuación numerada (equation)",
            "Ecuación sin número (\\[  \\])",
            "Ecuación alineada (align)",
            "Ecuación alineada sin número (align*)",
            "Ecuaciones multilínea (split)"
        ];

        const seleccionEq = await vscode.window.showQuickPick(opcionesEcuacion, {
            placeHolder: "Selecciona el tipo de ecuación que deseas insertar"
        });

        if (!seleccionEq) {
            return; // Usuario canceló
        }

        const editorEq = vscode.window.activeTextEditor;
        if (!editorEq) {
            vscode.window.showErrorMessage("No hay un editor activo.");
            return;
        }

        let snippetEq = "";

        switch (seleccionEq) {
            case opcionesEcuacion[0]:
                snippetEq =
`\\begin{equation}
    {}
    \\label{eq:}
\\end{equation}
`;
                break;

            case opcionesEcuacion[1]:
                snippetEq =
`\\[
    {}
\\]
`;
                break;

            case opcionesEcuacion[2]:
                await ensurePackage(editorEq.document, "amsmath");
                snippetEq =
`\\begin{align}
    {} &= {} \\\\
\\end{align}
`;
                break;

            case opcionesEcuacion[3]:
                await ensurePackage(editorEq.document, "amsmath");
                snippetEq =
`\\begin{align*}
    {} &= {} \\\\
\\end{align*}
`;
                break;

            case opcionesEcuacion[4]:
                await ensurePackage(editorEq.document, "amsmath");
                snippetEq =
`\\begin{equation}
    \\begin{split}
        {} &= {} \\\\
    \\end{split}
    \\label{eq:}
\\end{equation}
`;
                break;
        }

        editorEq.insertSnippet(new vscode.SnippetString(snippetEq));
    });

    // Register Scan Document command
    let scanDocument = vscode.commands.registerCommand('latexis.scanDocument', async () => {

        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No hay un editor activo.");
            return;
        }

        const activeDocument = editor.document;
        const activeText = activeDocument.getText();
        const workspaceFolders = vscode.workspace.workspaceFolders;

        // === VALIDACIÓN 1: SIN WORKSPACE (archivo suelto) ===
        if (!workspaceFolders) {
            if (!activeText.includes("\\documentclass")) {
                vscode.window.showWarningMessage(
                    "Este archivo no contiene \\documentclass. Abre la carpeta de tu proyecto para analizar múltiples archivos."
                );
                return;
            }
            // Caso especial: archivo único con documentclass → continuar normalmente
        }

        // === VALIDACIÓN 2: CON WORKSPACE → buscar archivo principal ===
        let mainDocument = await findMainTexDocument(activeDocument);
        const mainText = mainDocument.getText();

        if (workspaceFolders && !mainText.includes("\\documentclass")) {
            vscode.window.showWarningMessage(
                "No se encontró archivo principal con \\documentclass en este proyecto. Asegúrate de abrir la carpeta correcta."
            );
            return;
        }

        let allText = activeDocument.getText();

        // If we have a workspace, concatenate all .tex files' contents
        if (workspaceFolders && workspaceFolders.length > 0) {
            const texFiles = await vscode.workspace.findFiles('**/*.tex');
            for (const uri of texFiles) {
                const doc = await vscode.workspace.openTextDocument(uri);
                if (doc === activeDocument) {
                    continue;
                }
                allText += '\n' + doc.getText();
            }
        }

        const addedPackages: string[] = [];

        // Detect graphicx
        if (allText.includes('\\includegraphics')) {
            await ensurePackage(mainDocument, 'graphicx');
            addedPackages.push('graphicx');
        }

        // Detect wrapfig
        if (allText.includes('wrapfigure')) {
            await ensurePackage(mainDocument, 'wrapfig');
            if (!addedPackages.includes('graphicx')) {
                await ensurePackage(mainDocument, 'graphicx');
            }
            addedPackages.push('wrapfig');
        }

        // Detect amsmath usage
        if (allText.includes('\\begin{align') || allText.includes('\\begin{split')) {
            await ensurePackage(mainDocument, 'amsmath');
            addedPackages.push('amsmath');
        }

        if (addedPackages.length === 0) {
            vscode.window.showInformationMessage('No se detectaron paquetes faltantes.');
        } else {
            vscode.window.showInformationMessage('Paquetes añadidos al archivo principal: ' + addedPackages.join(', '));
        }
    });

    context.subscriptions.push(scanDocument);
	context.subscriptions.push(disposable);
	context.subscriptions.push(insertEquation);
	context.subscriptions.push(insertFigure);
}

// This method is called when your extension is deactivated
export function deactivate() {}
