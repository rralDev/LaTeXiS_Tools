// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { ensurePackage } from './utils/packages';
import {
    detectFigurePackages,
    detectTablePackages,
    detectMathPackages,
    detectReferencePackages,
    detectTextPackages
} from './detections';

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

    // ============================================================
    // LaTeXiS Extension Activation
    // Command registration is organized into clear functional groups:
    //   1) Basic insertion commands (figures, equations)
    //   2) Advanced insertion commands (APA config)
    //   3) Analysis commands (scanDocument)
    //
    // Reordering improves readability; execution order is unaffected.
    // ============================================================

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
                {
                    const mainDoc = await findMainTexDocument(editor.document);
                    await ensurePackage(mainDoc, "graphicx");
                    snippet =
`\\begin{figure}[hbtp]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{}
    \\caption{}
    \\label{fig:}
\\end{figure}
`;
                }
                break;

            case opciones[1]:
                {
                    const mainDoc = await findMainTexDocument(editor.document);
                    await ensurePackage(mainDoc, "graphicx");
                    snippet = "\\includegraphics[width=0.8\\textwidth]{}";
                }
                break;

            case opciones[2]:
                {
                    const mainDoc = await findMainTexDocument(editor.document);
                    await ensurePackage(mainDoc, "wrapfig");
                    await ensurePackage(mainDoc, "graphicx");
                    snippet =
`\\begin{wrapfigure}{r}{0.4\\textwidth}
    \\centering
    \\includegraphics[width=0.95\\linewidth]{}
    \\caption{}
    \\label{fig:}
\\end{wrapfigure}
`;
                }
                break;

            case opciones[3]:
                {
                    const mainDoc = await findMainTexDocument(editor.document);
                    await ensurePackage(mainDoc, "wrapfig");
                    await ensurePackage(mainDoc, "graphicx");
                    snippet =
`\\begin{wrapfigure}{l}{0.4\\textwidth}
    \\centering
    \\includegraphics[width=0.95\\linewidth]{}
    \\caption{}
    \\label{fig:}
\\end{wrapfigure}
`;
                }
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
                {
                    const mainDoc = await findMainTexDocument(editorEq.document);
                    await ensurePackage(mainDoc, "amsmath");
                    snippetEq =
`\\begin{align}
    {} &= {} \\\\
\\end{align}
`;
                }
                break;

            case opcionesEcuacion[3]:
                {
                    const mainDoc = await findMainTexDocument(editorEq.document);
                    await ensurePackage(mainDoc, "amsmath");
                    snippetEq =
`\\begin{align*}
    {} &= {} \\\\
\\end{align*}
`;
                }
                break;

            case opcionesEcuacion[4]:
                {
                    const mainDoc = await findMainTexDocument(editorEq.document);
                    await ensurePackage(mainDoc, "amsmath");
                    snippetEq =
`\\begin{equation}
    \\begin{split}
        {} &= {} \\\\
    \\end{split}
    \\label{eq:}
\\end{equation}
`;
                }
                break;
        }

        editorEq.insertSnippet(new vscode.SnippetString(snippetEq));
    });

    // ============================================================
    // 2) Advanced Insertion Commands
    // ============================================================

    // APA configuration command: inserts a full BibLaTeX + biber APA setup
    // into the main TeX document, detects existing .bib files, and avoids
    // conflicts with natbib / existing biblatex configurations.
    const insertAPAConfig = vscode.commands.registerCommand('latexis.insertAPAConfig', async () => {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No hay un editor activo.");
            return;
        }

        // 1) Locate main TeX document (with \\documentclass)
        const activeDoc = editor.document;
        const mainDocument = await findMainTexDocument(activeDoc);
        const mainText = mainDocument.getText();

        // 2) Basic sanity checks: ensure this really looks like a main file
        if (!mainText.includes("\\documentclass")) {
            vscode.window.showWarningMessage(
                "No se encontró \\documentclass en el archivo principal. Abre el archivo raíz de tu tesis antes de insertar la configuración APA."
            );
            return;
        }

        // 3) Detect existing biblatex usage
        if (mainText.includes("biblatex")) {
            vscode.window.showInformationMessage(
                "Este archivo ya contiene una configuración con biblatex. Revisa manualmente si deseas adaptarla al estilo APA."
            );
            return;
        }

        // 4) Detect natbib to avoid conflicts
        if (mainText.includes("natbib")) {
            vscode.window.showWarningMessage(
                "Se detectó natbib en el archivo principal. LaTeXiS no agregará biblatex para evitar conflictos. " +
                "Elimina natbib manualmente si deseas usar biblatex con APA."
            );
            return;
        }

        // 5) Determine which .bib file to reference
        const workspaceFolders = vscode.workspace.workspaceFolders;
        let bibResource = "bibliografia.bib";
        let shouldCreateBibFile = false;

        if (workspaceFolders && workspaceFolders.length > 0) {
            const bibFiles = await vscode.workspace.findFiles("**/*.bib");
            if (bibFiles.length === 1) {
                // Single .bib file found → reuse it
                bibResource = vscode.workspace.asRelativePath(bibFiles[0], false);
            } else if (bibFiles.length > 1) {
                // Multiple .bib files → let the user choose one or create a new file
                const options = bibFiles.map(uri => vscode.workspace.asRelativePath(uri, false));
                const createNewLabel = "Crear nuevo bibliografia.bib";
                options.unshift(createNewLabel);

                const picked = await vscode.window.showQuickPick(options, {
                    placeHolder: "Selecciona el archivo .bib para usar con APA o crea uno nuevo"
                });

                if (!picked) {
                    // User cancelled
                    return;
                }

                if (picked === createNewLabel) {
                    shouldCreateBibFile = true;
                    bibResource = "bibliografia.bib";
                } else {
                    bibResource = picked;
                }
            } else {
                // No .bib files found → create a new one
                shouldCreateBibFile = true;
            }
        } else {
            // No workspace → default to local bibliografia.bib next to the main document
            shouldCreateBibFile = true;
        }

        // 6) Insert APA configuration block after \\documentclass
        const lines = mainText.split("\\n");
        let insertLine = 0;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("\\documentclass")) {
                insertLine = i + 1;
                break;
            }
        }

        const apaBlock =
`% ============================
%   Configuración APA (LaTeXiS)
% ============================

\\usepackage[backend=biber,style=apa]{biblatex}
\\DeclareLanguageMapping{spanish}{spanish-apa}
\\usepackage{csquotes}

% Archivo(s) de bibliografía
\\addbibresource{${bibResource}}

`;

        const edit = new vscode.WorkspaceEdit();
        edit.insert(mainDocument.uri, new vscode.Position(insertLine, 0), apaBlock);
        await vscode.workspace.applyEdit(edit);

        // 8) Insert \printbibliography before \end{document} if not already present
        // This step ensures the bibliography appears automatically in the final document output.
        // It only runs if \printbibliography is not already present.
        const refreshedText = mainDocument.getText();

        // Only attempt insertion if not present
        if (!refreshedText.includes("\\printbibliography")) {

            // Find the final \end{document}
            const endIndex = refreshedText.lastIndexOf("\\end{document}");
            if (endIndex !== -1) {
                const beforeEnd = refreshedText.substring(0, endIndex);
                const afterEnd = refreshedText.substring(endIndex);

                const newContent =
`${beforeEnd}

% ============================
%   Bibliografía (LaTeXiS)
% ============================
\\printbibliography

${afterEnd}`;

                const fullEdit = new vscode.WorkspaceEdit();
                fullEdit.replace(
                    mainDocument.uri,
                    new vscode.Range(0, 0, mainDocument.lineCount, 0),
                    newContent
                );

                await vscode.workspace.applyEdit(fullEdit);
            }
        }

        // 7) Optionally create bibliografia.bib (or chosen .bib) if required
        if (shouldCreateBibFile) {
            try {
                let bibUri: vscode.Uri;

                if (workspaceFolders && workspaceFolders.length > 0) {
                    // Create the .bib file in the workspace root
                    const root = workspaceFolders[0].uri;
                    bibUri = vscode.Uri.joinPath(root, bibResource);
                } else {
                    // Create next to the main document
                    const mainUri = mainDocument.uri;
                    const mainDir = mainUri.with({ path: mainUri.path.replace(/[^/]+$/, "") });
                    bibUri = vscode.Uri.joinPath(mainDir, bibResource);
                }

                // Check if file already exists
                let exists = false;
                try {
                    await vscode.workspace.fs.stat(bibUri);
                    exists = true;
                } catch {
                    exists = false;
                }

                if (!exists) {
                    const encoder = new TextEncoder();
                    const initialContent =
`% Archivo de bibliografía creado por LaTeXiS
% Añade aquí tus entradas BibLaTeX (formato .bib)

`;
                    await vscode.workspace.fs.writeFile(bibUri, encoder.encode(initialContent));
                    vscode.window.showInformationMessage(
                        `Configuración APA insertada. Se creó el archivo de bibliografía: ${bibResource}.`
                    );
                } else {
                    vscode.window.showInformationMessage(
                        `Configuración APA insertada. El archivo de bibliografía ${bibResource} ya existía y no se modificó.`
                    );
                }
            } catch (error) {
                vscode.window.showWarningMessage(
                    "Se insertó la configuración APA, pero hubo un problema al crear el archivo .bib. " +
                    "Crea el archivo de bibliografía manualmente si es necesario."
                );
            }
        } else {
            vscode.window.showInformationMessage(
                `Configuración APA insertada usando el archivo de bibliografía existente: ${bibResource}.`
            );
        }
    });

    // ============================================================
    // 3) Analysis Commands
    // ============================================================

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

        // New modular detection system
        const detected = new Set<string>();

        for (const detector of [
            detectFigurePackages,
            detectTablePackages,
            detectMathPackages,
            detectReferencePackages,
            detectTextPackages
        ]) {
            const pkgs = detector(allText);
            pkgs.forEach(pkg => detected.add(pkg));
        }

        // --- Improved package insertion: only report newly added packages ----
        const mainTextNow = mainDocument.getText();
        const newlyAdded: string[] = [];

        for (const pkg of detected) {
            const regex = new RegExp(`\\\\usepackage\\s*(?:\\[[^\\]]*\\])?\\s*\\{${pkg}\\}`);
            if (!regex.test(mainTextNow)) {
                await ensurePackage(mainDocument, pkg);
                newlyAdded.push(pkg);
            }
        }

        if (newlyAdded.length === 0) {
            vscode.window.showInformationMessage("No se añadieron nuevos paquetes. Todo está completo.");
        } else {
            vscode.window.showInformationMessage(
                "Nuevos paquetes añadidos al archivo principal: " + newlyAdded.join(", ")
            );
        }
    });

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    const disposable = vscode.commands.registerCommand('latexis.helloWorld', () => {
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from LaTeXiS!');
    });

    context.subscriptions.push(insertFigure);
    context.subscriptions.push(insertEquation);
    context.subscriptions.push(insertAPAConfig);
    context.subscriptions.push(scanDocument);
    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
