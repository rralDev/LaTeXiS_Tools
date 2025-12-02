// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

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
                snippet = "\\includegraphics[width=0.8\\textwidth]{}";
                break;

            case opciones[2]:
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

	context.subscriptions.push(disposable);
	context.subscriptions.push(insertFigure);
}

// This method is called when your extension is deactivated
export function deactivate() {}
