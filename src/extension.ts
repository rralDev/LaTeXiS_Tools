// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ensurePackage } from './utils/packages';

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

        const document = editor.document;
        const text = document.getText();

        // Paquetes detectados
        const addedPackages: string[] = [];

        // Detect graphicx
        if (text.includes("\\includegraphics")) {
            await ensurePackage(document, "graphicx");
            addedPackages.push("graphicx");
        }

        // Detect wrapfig
        if (text.includes("wrapfigure")) {
            await ensurePackage(document, "wrapfig");
            if (!addedPackages.includes("graphicx")) {
                await ensurePackage(document, "graphicx");
            }
            addedPackages.push("wrapfig");
        }

        // Detect amsmath usage
        if (text.includes("\\begin{align") || text.includes("\\begin{split")) {
            await ensurePackage(document, "amsmath");
            addedPackages.push("amsmath");
        }

        if (addedPackages.length === 0) {
            vscode.window.showInformationMessage("No se detectaron paquetes faltantes.");
        } else {
            vscode.window.showInformationMessage("Paquetes añadidos: " + addedPackages.join(", "));
        }
    });

    context.subscriptions.push(scanDocument);
	context.subscriptions.push(disposable);
	context.subscriptions.push(insertEquation);
	context.subscriptions.push(insertFigure);
}

// This method is called when your extension is deactivated
export function deactivate() {}
