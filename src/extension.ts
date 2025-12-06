// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';
import { ensurePackage } from './utils/packages';
import { ensureGraphicspath } from './utils/graphicsPath';
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
    if (/^\s*\\documentclass(?:\[[^\]]*\])?\{[^}]+\}/m.test(activeText)) {
        return activeDocument;
    }

    // 3) Search for any .tex file with a documentclass
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

// Fallback: use active document
    return activeDocument;
}

async function ensureImageFolder(baseUri?: vscode.Uri): Promise<vscode.Uri | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // Decide the logical "root" where image folders should live
    let root: vscode.Uri | null = null;

    if (workspaceFolders && workspaceFolders.length > 0) {
        // Workspace opened → use workspace root
        root = workspaceFolders[0].uri;
    } else if (baseUri) {
        // No workspace → use the folder of the active document
        const dirPath = baseUri.with({ path: baseUri.path.replace(/[^/]+$/, "") });
        root = dirPath;
    } else {
        vscode.window.showWarningMessage("LaTeXiS: No se encontró carpeta de proyecto.");
        return null;
    }

    // Possible image folder names to search for
    const candidateFolders = ["img", "imgs", "imagenes", "figures"];
    let foundFolder: vscode.Uri | null = null;

    for (const folder of candidateFolders) {
        const folderUri = vscode.Uri.joinPath(root, folder);
        try {
            const stat = await vscode.workspace.fs.stat(folderUri);
            if (stat) {
                foundFolder = folderUri;
                break;
            }
        } catch {
            // Folder does not exist → continue searching
        }
    }

    // If no folder exists → create default img/ directory
    if (!foundFolder) {
        foundFolder = vscode.Uri.joinPath(root, "img");
        await vscode.workspace.fs.createDirectory(foundFolder);
        vscode.window.showInformationMessage("LaTeXiS: No se detectó carpeta de imágenes. Se creó 'img/'.");
    }

    // Check whether the folder is empty
    let files: [string, vscode.FileType][] = [];
    try {
        files = await vscode.workspace.fs.readDirectory(foundFolder);
    } catch {
        // Failed to read directory → continue gracefully
    }

    const hasImages = files.some(([name]) =>
        name.match(/\.(png|jpg|jpeg|pdf|eps)$/i)
    );

    // If no images exist in the folder, copy logo_latexis.png as a sample image
    if (!hasImages) {
        try {
            const extension = vscode.extensions.getExtension("LuisRobles.latexis");
            if (!extension) {
                vscode.window.showWarningMessage("LaTeXiS: No se pudo encontrar el paquete para copiar la imagen.");
                return foundFolder;
            }

            const source = vscode.Uri.joinPath(
                extension.extensionUri,
                "resources",
                "logo_latexis.png"
            );

            const destination = vscode.Uri.joinPath(foundFolder, "logo_latexis.png");

            const data = await vscode.workspace.fs.readFile(source);
            await vscode.workspace.fs.writeFile(destination, data);

            vscode.window.showInformationMessage("LaTeXiS: Se añadió una imagen de ejemplo (logo_latexis.png).");
        } catch {
            vscode.window.showWarningMessage("LaTeXiS: No se pudo copiar la imagen de ejemplo.");
        }
    }

    return foundFolder;
}


/**
 * Checks whether the given document is included in the main .tex file
 * using \input{} or \include{}. Warns if not included or commented.
 */
async function checkFileIncludedInMain(currentDoc: vscode.TextDocument, mainDoc: vscode.TextDocument): Promise<void> {
    const mainText = mainDoc.getText();

    // Build list of candidate relative paths
    const rel = vscode.workspace.asRelativePath(currentDoc.uri, false)
        .replace(/\.tex$/i, "");

    const candidates = [
        rel,
        rel.replace(/\\/g, "/")
    ];

    const patternsIncluded = candidates.map(c => new RegExp(`\\\\(?:input|include)\\{${c}\\}`, "m"));
    const patternsIncludedWithTex = candidates.map(c => new RegExp(`\\\\(?:input|include)\\{${c}\\.tex\\}`, "m"));

    const patternsCommented = candidates.map(c => new RegExp(`^\\s*%.*\\\\(?:input|include)\\{${c}\\}`, "m"));
    const patternsCommentedWithTex = candidates.map(c => new RegExp(`^\\s*%.*\\\\(?:input|include)\\{${c}\\.tex\\}`, "m"));

    // Check commented first
    for (const p of [...patternsCommented, ...patternsCommentedWithTex]) {
        if (p.test(mainText)) {
            vscode.window.showWarningMessage(
                "LaTeXiS: Este archivo está incluido en el archivo principal, porque está comentado. La figura podría no aparecer en el PDF final."
            );
            return;
        }
    }

    // Check real inclusion
    for (const p of [...patternsIncluded, ...patternsIncludedWithTex]) {
        if (p.test(mainText)) {
            return; // OK
        }
    }

    // If no match
    vscode.window.showWarningMessage(
        "LaTeXiS: Este archivo no parece estar incluido en el archivo principal. La figura podría no aparecer en el PDF final."
    );
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

    // ========================= INSERT FIGURE (A2‑C GOD MODE — FINAL) =========================
    // ========================= INSERT FIGURE (A2-C GOD MODE — MENU) =========================
let insertFigure = vscode.commands.registerCommand('latexis.insertFigure', async () => {

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No hay un editor activo.");
        return;
    }

    const activeText = editor.document.getText();
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // === Caso 1: archivo suelto SIN \documentclass ===
    if (!workspaceFolders && !activeText.includes("\\documentclass")) {
        vscode.window.showWarningMessage(
            "LaTeXiS: Este archivo no contiene \\documentclass. Abre el archivo principal o la carpeta del proyecto antes de insertar figuras."
        );
        return;
    }

    // Localizar archivo principal (main.tex o equivalente)
    const mainDoc = await findMainTexDocument(editor.document);
    const mainText = mainDoc.getText();
    await checkFileIncludedInMain(editor.document, mainDoc);

    // === Caso 2: proyecto SIN archivo principal válido ===
    if (workspaceFolders && !mainText.includes("\\documentclass")) {
        vscode.window.showWarningMessage(
            "LaTeXiS: No se encontró archivo principal con \\documentclass en este proyecto."
        );
        return;
    }

    // 0) Ask user which kind of figure snippet to insert
    const opcionesFigura = [
        "Figura completa (entorno figure)",
        "Solo \\includegraphics",
        "Figura alineada a la derecha (wrapfigure)",
        "Figura alineada a la izquierda (wrapfigure)"
    ];

    const seleccion = await vscode.window.showQuickPick(opcionesFigura, {
        placeHolder: "Selecciona el tipo de figura que deseas insertar"
    });

    if (!seleccion) {
        // User cancelled
        return;
    }

    // 1) Ensure image folder exists (workspace root or alongside the current file)
    const imageFolder = await ensureImageFolder(editor.document.uri);
    if (!imageFolder) {
        vscode.window.showWarningMessage("LaTeXiS: No se pudo preparar la carpeta de imágenes.");
        return;
    }

    // 2) Compute clean relative path for includegraphics
    let relativeImageFolder: string;

    if (workspaceFolders && workspaceFolders.length > 0) {
        // Workspace case → relative to workspace root
        relativeImageFolder = vscode.workspace.asRelativePath(imageFolder, false);
    } else {
        // Single-file case → img/ is created next to the current .tex
        relativeImageFolder = "img";
    }

    if (!relativeImageFolder.endsWith("/")) {
        relativeImageFolder += "/";
    }

    // 3) Choose default image (first existing or logo fallback)
    const files = await vscode.workspace.fs.readDirectory(imageFolder);
    let defaultImage = "logo_latexis.png";

    for (const [name] of files) {
        if (name.match(/\.(png|jpg|jpeg|pdf|eps)$/i)) {
            defaultImage = name;
            break;
        }
    }
    const defaultPath = `${relativeImageFolder}${defaultImage}`;
    const defaultImageNoExt = defaultImage.replace(/\.[^/.]+$/, "");

    // 4) Build the snippet depending on the selected option
    let snippet: vscode.SnippetString;

    // Insert required packages and update graphicspath in the main document
    await ensurePackage(mainDoc, "graphicx");
    await ensureGraphicspath(mainDoc);

    if (seleccion === opcionesFigura[0]) {
        // Figura completa (entorno figure)
        snippet = new vscode.SnippetString(
`\\begin{figure}[hbtp]
    \\centering
    \\includegraphics[width=0.8\\textwidth]{\${1:${defaultImageNoExt}}}
    \\caption{\${2:Descripción de la figura}}
    \\label{fig:\${3:etiqueta_de_figura}}
\\end{figure}`
        );
    } else if (seleccion === opcionesFigura[1]) {
        // Solo includegraphics
        snippet = new vscode.SnippetString(
`\\includegraphics[width=0.8\\textwidth]{\${1:${defaultImageNoExt}}}`
        );
    } else if (seleccion === opcionesFigura[2]) {
        // Figura alineada a la derecha (wrapfigure)
        await ensurePackage(mainDoc, "wrapfig");
        snippet = new vscode.SnippetString(
`\\begin{wrapfigure}{r}{0.4\\textwidth}
    \\centering
    \\includegraphics[width=0.38\\textwidth]{\${1:${defaultImageNoExt}}}
    \\caption{\${2:Descripción de la figura}}
    \\label{fig:\${3:etiqueta_de_figura}}
\\end{wrapfigure}`
        );
    } else {
        // Figura alineada a la izquierda (wrapfigure)
        await ensurePackage(mainDoc, "wrapfig");
        snippet = new vscode.SnippetString(
`\\begin{wrapfigure}{l}{0.4\\textwidth}
    \\centering
    \\includegraphics[width=0.38\\textwidth]{\${1:${defaultImageNoExt}}}
    \\caption{\${2:Descripción de la figura}}
    \\label{fig:\${3:etiqueta_de_figura}}
\\end{wrapfigure}`
        );
    }

    // 5) Insert the chosen snippet
    editor.insertSnippet(snippet);
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
