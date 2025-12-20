// VS Code API imports
import * as vscode from 'vscode';
import { ensurePackage } from './utils/packages';
import { ensureGraphicspath } from './utils/graphicsPath';
import { pasteSimpleTable } from "./features/tableFromClipboard/pasteSimpleTable";
import { insertExcelTable } from "./features/tableFromExcel/insertExcelTable";


import {
    detectFigurePackages,
    detectTablePackages,
    detectMathPackages,
    detectReferencePackages,
    detectTextPackages
} from './detections';

export async function findMainTexDocument(activeDocument: vscode.TextDocument): Promise<vscode.TextDocument> {
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

// Fallback: return the active document
    return activeDocument;
}

async function ensureImageFolder(baseUri?: vscode.Uri): Promise<vscode.Uri | null> {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // Determine the logical root directory for image folders
    let root: vscode.Uri | null = null;

    if (workspaceFolders && workspaceFolders.length > 0) {
        // Workspace is open → use workspace root as base
        root = workspaceFolders[0].uri;
    } else if (baseUri) {
        // No workspace → use active file’s directory
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

    // If no folder exists, create default img/ directory
    if (!foundFolder) {
        foundFolder = vscode.Uri.joinPath(root, "img");
        await vscode.workspace.fs.createDirectory(foundFolder);
        vscode.window.showInformationMessage("LaTeXiS: No se detectó carpeta de imágenes. Se creó 'img/'.");
    }

    // Check if folder contains any image files
    let files: [string, vscode.FileType][] = [];
    try {
        files = await vscode.workspace.fs.readDirectory(foundFolder);
    } catch {
        // Failed to read directory → continue gracefully
    }

    const hasImages = files.some(([name]) =>
        name.match(/\.(png|jpg|jpeg|pdf|eps)$/i)
    );

    // If folder has no images, copy logo_latexis.png as example
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

    // Build list of relative-path candidates
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

    // Check if inclusion is commented out
    for (const p of [...patternsCommented, ...patternsCommentedWithTex]) {
        if (p.test(mainText)) {
            vscode.window.showWarningMessage(
                "LaTeXiS: La inclusión de este archivo, está comentado en el archivo principal. La figura podría no aparecer en el PDF final."
            );
            return;
        }
    }

    // Check actual inclusion
    for (const p of [...patternsIncluded, ...patternsIncludedWithTex]) {
        if (p.test(mainText)) {
            return; // OK
        }
    }

    // If no inclusion found
    vscode.window.showWarningMessage(
        "LaTeXiS: Este archivo parece no estar incluido en el archivo principal. La figura podría no aparecer en el PDF final."
    );
}

// LaTeXiS Extension Activation — Registers commands and initializes extension behavior
export function activate(context: vscode.ExtensionContext) {

    // ========================= INSERT FIGURE (A2‑C GOD MODE — FINAL) =========================
    // ========================= INSERT FIGURE (A2-C GOD MODE — MENU) =========================
let insertFigure = vscode.commands.registerCommand('latexis.insertFigure', async () => {

    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No hay un editor activo.");
        return;
    }

    const activeText = editor.document.getText();
    const activeHasDC = activeText.includes("\\documentclass");
    const workspaceFolders = vscode.workspace.workspaceFolders;

    // === Caso 1: archivo suelto SIN \\documentclass ===
    if (!workspaceFolders && !activeHasDC) {
        vscode.window.showWarningMessage(
            "LaTeXiS: Este archivo no contiene \\documentclass. Abre el archivo principal o la carpeta del proyecto antes de insertar figuras."
        );
        return;
    }

    // Localizar archivo principal (main.tex o equivalente)
    const mainDoc = await findMainTexDocument(editor.document);
    const mainText = mainDoc.getText();
    const inProject = !!workspaceFolders;
    const hasMain = mainText.includes("\\documentclass");

    // === Caso 2: proyecto SIN archivo principal válido ===
    if (workspaceFolders && !hasMain) {
        vscode.window.showWarningMessage(
            "LaTeXiS: No se encontró el archivo principal con \\documentclass en este proyecto."
        );
        return;
    }

    // Solo verificar inclusión si hay proyecto, hay main y el archivo activo no es el main
    if (inProject && hasMain && !activeHasDC) {
        await checkFileIncludedInMain(editor.document, mainDoc);
    }

    // Ensure base packages
    await ensurePackage(mainDoc, "graphicx");

    const mainTextForPaths = mainDoc.getText();

    // ============================================================
    // Image directory inspection (deterministic, incremental)
    // ============================================================

    // Directories that must NEVER be considered image sources
    const EXCLUDED_DIRS = new Set([
        "build", "Build", "out", "dist", "target", "bin", ".git", ".vscode"
    ]);

    const isImageFile = (name: string) =>
        /\.(png|jpg|jpeg|eps)$/i.test(name);

    // Resolve path relative to main.tex
    const mainDir = mainDoc.uri.with({
        path: mainDoc.uri.path.replace(/[^/]+$/, "")
    });

    // 1) Collect image directories
    const imageDirs: vscode.Uri[] = [];

    // 1a) From existing \graphicspath (user intent has priority)
    // NOTE: \graphicspath has nested braces, e.g. \graphicspath{{img/}{figures/}}
    // Use a safer regex that captures one-or-more {path/} entries.
    const gpMatch = mainDoc
        .getText()
        .match(/\\graphicspath\s*\{((?:\{[^{}]*\})+)\s*\}/m);
    if (gpMatch) {
        const entries = gpMatch[1].match(/\{([^}]+)\}/g) || [];
        for (const e of entries) {
            const raw = e.slice(1, -1).replace(/\/+$/, "");
            if (!raw) continue;
            imageDirs.push(vscode.Uri.joinPath(mainDir, raw));
        }
    }

    // 1b) Scan workspace root or main file directory
    const scanRoot = workspaceFolders?.[0]?.uri ?? mainDir;

    try {
        const entries = await vscode.workspace.fs.readDirectory(scanRoot);
        for (const [name, type] of entries) {
            if (type !== vscode.FileType.Directory) continue;
            if (EXCLUDED_DIRS.has(name)) continue;

            const dirUri = vscode.Uri.joinPath(scanRoot, name);
            try {
                const files = await vscode.workspace.fs.readDirectory(dirUri);
                if (files.some(([f]) => isImageFile(f))) {
                    imageDirs.push(dirUri);
                }
            } catch {
                // ignore unreadable dirs
            }
        }
    } catch {
        // ignore root read errors
    }

    // Deduplicate directories
    const uniqueDirs: vscode.Uri[] = [];
    const seen = new Set<string>();
    for (const d of imageDirs) {
        const key = d.toString();
        if (!seen.has(key)) {
            seen.add(key);
            uniqueDirs.push(d);
        }
    }

    // 2) Ensure at least one directory exists
    let finalDirs = uniqueDirs;
    if (finalDirs.length === 0) {
        const fallback = await ensureImageFolder(editor.document.uri);
        if (!fallback) return;
        finalDirs = [fallback];
    }

    // 3) Ensure \graphicspath contains ALL directories (rebuild safely)
    const existingText = mainDoc.getText();

    // IMPORTANT: Avoid naive [\s\S]*? because it stops at the first '}' and corrupts nested braces.
    // Match the canonical form: \graphicspath{{dir/}{dir2/}}
    const gpRegex = /\\graphicspath\s*\{(?:\{[^{}]*\})+\s*\}/g;
    const matches = existingText.match(gpRegex);

    // Construir lista FINAL normalizada de rutas (sin llaves, sin duplicados)
    const normalizedDirs = new Set<string>();

    for (const dir of finalDirs) {
        let rel: string;
        if (workspaceFolders && workspaceFolders.length > 0) {
            rel = vscode.workspace.asRelativePath(dir, false);
        } else {
            rel = dir.path.replace(mainDir.path, "").replace(/^\/+/, "");
        }
        rel = rel.replace(/\\/g, "/").replace(/\/+$/, "");
        normalizedDirs.add(rel);
    }

    // Rebuild graphicspath in a single canonical form:
    // \graphicspath{{dir1/}{dir2/}}
    let rebuiltGp = "\\graphicspath{";
    for (const d of normalizedDirs) {
        rebuiltGp += `{${d}/}`;
    }
    rebuiltGp += "}";

    if (matches && matches.length > 0) {
        // Remove ALL existing graphicspath occurrences (corrupted or not)
        let cleanedText = existingText;
        for (const m of matches) {
            cleanedText = cleanedText.replace(m, "");
        }

        // Insert rebuilt graphicspath after \\usepackage{graphicx} or \\documentclass
        const lines = cleanedText.split("\n");
        let insertAt = 0;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("\\usepackage") && lines[i].includes("graphicx")) {
                insertAt = i + 1;
                break;
            }
            if (lines[i].includes("\\documentclass")) {
                insertAt = i + 1;
            }
        }

        lines.splice(insertAt, 0, rebuiltGp);

        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            mainDoc.uri,
            new vscode.Range(0, 0, mainDoc.lineCount, 0),
            lines.join("\n")
        );
        await vscode.workspace.applyEdit(edit);

    } else {
        // Insert graphicspath for the first time
        const lines = existingText.split("\n");
        let insertAt = 0;

        for (let i = 0; i < lines.length; i++) {
            if (lines[i].includes("\\usepackage") && lines[i].includes("graphicx")) {
                insertAt = i + 1;
                break;
            }
            if (lines[i].includes("\\documentclass")) {
                insertAt = i + 1;
            }
        }

        lines.splice(insertAt, 0, rebuiltGp);

        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            mainDoc.uri,
            new vscode.Range(0, 0, mainDoc.lineCount, 0),
            lines.join("\n")
        );
        await vscode.workspace.applyEdit(edit);
    }

    // 4) Pick default image (alphabetical, first directory)
    let defaultImageName = "logo_latexis";
    for (const dir of finalDirs) {
        try {
            const files = await vscode.workspace.fs.readDirectory(dir);
            const imgs = files
                .map(([n]) => n)
                .filter(isImageFile)
                .sort((a, b) => a.localeCompare(b));
            if (imgs.length > 0) {
                defaultImageName = imgs[0].replace(/\.[^/.]+$/, "");
                break;
            }
        } catch {
            // continue
        }
    }

    // === Main UX menu ===
    const mainOptions = [
        "📷 Figura estándar",
        "🧩 Figura compuesta (subfiguras)",
        "↔️ Figura a ancho completo (2 columnas)",
        "📰 Imagen con texto alrededor (wrapfigure)",
        "📐 Figura con caption lateral (SCfigure)",
        "📎 Solo imagen (inline)"
    ];

    const choice = await vscode.window.showQuickPick(mainOptions, {
        placeHolder: "Selecciona el tipo de figura a insertar"
    });

    if (!choice) {
        return;
    }

    let snippet: vscode.SnippetString;

    // === Figura estándar ===
    if (choice === mainOptions[0]) {
        await ensurePackage(mainDoc, "float");
        snippet = new vscode.SnippetString(
`\\begin{figure}[H]
  \\centering
  \\includegraphics[width=0.8\\textwidth]{${defaultImageName}}
  \\caption{\${1:Descripción de la figura}}
  \\label{fig:\${2:etiqueta}}
\\end{figure}`
        );
    }

    // === Figura compuesta (subfiguras) ===
    else if (choice === mainOptions[1]) {
        await ensurePackage(mainDoc, "subcaption");
        await ensurePackage(mainDoc, "float");
        snippet = new vscode.SnippetString(
`\\begin{figure}[H]
\\centering
\\begin{subfigure}{0.45\\textwidth}
  \\centering
  \\includegraphics{${defaultImageName}}
  \\caption{Primera descripción}
\\end{subfigure}
\\begin{subfigure}{0.45\\textwidth}
  \\centering
  \\includegraphics{${defaultImageName}}
  \\caption{Segunda descripción}
\\end{subfigure}
\\caption{\${1:Descripción general}}
\\label{fig:\${2:etiqueta}}
\\end{figure}`
        );
    }

    // === Figura a ancho completo ===
    else if (choice === mainOptions[2]) {
        snippet = new vscode.SnippetString(
`\\begin{figure*}[t]
  \\centering
  \\includegraphics[width=\\textwidth]{${defaultImageName}}
  \\caption{\${1:Descripción de la figura}}
  \\label{fig:\${2:etiqueta}}
\\end{figure*}`
        );
    }

    // === Imagen con texto alrededor ===
    else if (choice === mainOptions[3]) {
        await ensurePackage(mainDoc, "wrapfig");

        const side = await vscode.window.showQuickPick(
            ["Texto a la derecha", "Texto a la izquierda"],
            { placeHolder: "¿Dónde debe ir el texto?" }
        );

        if (!side) {
            return;
        }

        const pos = side.includes("derecha") ? "r" : "l";
        snippet = new vscode.SnippetString(
`\\begin{wrapfigure}{${pos}}{0.4\\textwidth}
  \\centering
  \\includegraphics[width=0.38\\textwidth]{${defaultImageName}}
  \\caption{\${1:Descripción}}
\\end{wrapfigure}`
        );
    }

    // === Figura con caption lateral (SCfigure) ===
    else if (choice === mainOptions[4]) {
        await ensurePackage(mainDoc, "sidecap");

        snippet = new vscode.SnippetString(
`\\begin{SCfigure}[0.5][htbp]
  \\centering
  \\includegraphics[width=0.45\\textwidth]{${defaultImageName}}
  \\caption{\${1:Descripción de la figura}}
  \\label{fig:\${2:etiqueta}}
\\end{SCfigure}`
        );
    }

    // === Solo imagen (inline) ===
    else {
        snippet = new vscode.SnippetString(
`\\includegraphics[width=0.5\\textwidth]{${defaultImageName}}`
        );
    }

    editor.insertSnippet(snippet);
});

    // Register the Insert Equation command
    let insertEquation = vscode.commands.registerCommand('latexis.insertEquation', async () => {

        const editorEq = vscode.window.activeTextEditor;
        if (!editorEq) {
            vscode.window.showErrorMessage("No hay un editor activo.");
            return;
        }

        // Helper: LaTeX newline (ensures \\ in final .tex)
        const latexNL = (times: number = 1): string => {
            return Array(times).fill('\\\\\\\\').join('\n');
        };

        // Two-level UX menu (category -> template)
        const categorias = [
            "📌 Ecuación simple",
            "📐 Ecuaciones alineadas",
            "🧮 Sistemas y matrices",
            "📊 Multilínea",
            "⚛️ Física (ejemplos)"
        ];

        const categoria = await vscode.window.showQuickPick(categorias, {
            placeHolder: "Selecciona la categoría de ecuación"
        });

        if (!categoria) {
            return; // User canceled
        }

        // Helper: ensure amsmath only when needed
        const ensureAmsMath = async () => {
            const mainDoc = await findMainTexDocument(editorEq.document);
            await ensurePackage(mainDoc, "amsmath");
        };

        let snippetEq: vscode.SnippetString | null = null;

        // ------------------------------------------------------------
        // 📌 Ecuación simple
        // ------------------------------------------------------------
        if (categoria === categorias[0]) {
            const opciones = [
                "Numerada (equation)",
                "Sin numerar (\\[ \\])"
            ];

            const picked = await vscode.window.showQuickPick(opciones, {
                placeHolder: "Selecciona el tipo de ecuación simple"
            });

            if (!picked) return;

            if (picked === opciones[0]) {
                snippetEq = new vscode.SnippetString(
                    "\\begin{equation}\n" +
                    "  \\vec{F} = m \\vec{a}\n" +
                    "  \\\\label{eq:${1:etiqueta}}\n" +
                    "\\end{equation}\n"
                );
            } else {
                snippetEq = new vscode.SnippetString(
                    "\\\\[\n" +
                    "  ${1:E = m c^2}\n" +
                    "\\\\]\n"
                );
            }
        }

        // ------------------------------------------------------------
        // 📐 Ecuaciones alineadas
        // ------------------------------------------------------------
        else if (categoria === categorias[1]) {
            await ensureAmsMath();

            const opciones = [
                "align (numeradas)",
                "align* (sin número)"
            ];

            const picked = await vscode.window.showQuickPick(opciones, {
                placeHolder: "Selecciona el entorno alineado"
            });

            if (!picked) return;

            if (picked === opciones[0]) {
                snippetEq = new vscode.SnippetString(
                  "\\begin{align}\n" +
                  "  \\vec{F} &= m \\vec{a} " + latexNL() + "\n" +
                  "  \\vec{a} &= \\\\frac{\\vec{F}}{m}\n" +
                  "\\end{align}\n"
                );
            } else {
                snippetEq = new vscode.SnippetString(
                  "\\begin{align*}\n" +
                  "  \\\\nabla \\\\cdot \\\\vec{E} &= \\\\frac{\\\\rho}{\\\\varepsilon_0} " + latexNL() + "\n" +
                  "  \\\\nabla \\\\cdot \\\\vec{B} &= 0\n" +
                  "\\end{align*}\n"
                );
            }
        }

        // ------------------------------------------------------------
        // 🧮 Sistemas y matrices
        // ------------------------------------------------------------
        else if (categoria === categorias[2]) {
            await ensureAmsMath();

            const opciones = [
                "Sistema de ecuaciones (cases)",
                "Matriz (pmatrix)",
                "Determinante (vmatrix)"
            ];

            const picked = await vscode.window.showQuickPick(opciones, {
                placeHolder: "Selecciona una plantilla"
            });

            if (!picked) return;

            if (picked === opciones[0]) {
                snippetEq = new vscode.SnippetString(
                    "\\begin{equation}\n" +
                    "  \\\\begin{cases}\n" +
                    "    x + y = 1 " + latexNL() + "\n" +
                    "    x - y = 3\n" +
                    "  \\\\end{cases}\n" +
                    "  \\\\label{eq:${1:etiqueta}}\n" +
                    "\\end{equation}\n"
                );
            } else if (picked === opciones[1]) {
                    snippetEq = new vscode.SnippetString(
                    "\\begin{equation}\n" +
                    "  \\\\begin{pmatrix}\n" +
                    "    a & b " + latexNL() + "\n" +
                    "    c & d\n" +
                    "  \\\\end{pmatrix}\n" +
                    "  \\\\label{eq:${1:etiqueta}}\n" +
                    "\\end{equation}\n"
                    );
            } else {
                    snippetEq = new vscode.SnippetString(
                    "\\begin{equation}\n" +
                    "  \\\\begin{vmatrix}\n" +
                    "    a & b " + latexNL() + "\n" +
                    "    c & d\n" +
                    "  \\\\end{vmatrix}\n" +
                    "  \\\\label{eq:${1:etiqueta}}\n" +
                    "\\end{equation}\n"
                    );
            }
        }

        // ------------------------------------------------------------
        // 📊 Multilínea
        // ------------------------------------------------------------
        else if (categoria === categorias[3]) {
            await ensureAmsMath();

            const opciones = [
                "split dentro de equation (recomendado)",
                "multline (amsmath)"
            ];

            const picked = await vscode.window.showQuickPick(opciones, {
                placeHolder: "Selecciona el formato multilínea"
            });

            if (!picked) return;

            if (picked === opciones[0]) {
                snippetEq = new vscode.SnippetString(
                    "\\begin{equation}\n" +
                    "  \\\\begin{split}\n" +
                    "    i\\\\hbar \\\\frac{\\\\partial \\\\Psi}{\\\\partial t}\n" +
                    "      &= -\\\\frac{\\\\hbar^2}{2m} \\\\nabla^2 \\\\Psi " + latexNL() + "\n" +
                    "      &+ V \\\\Psi\n" +
                    "  \\\\end{split}\n" +
                    "  \\\\label{eq:${1:schrodinger}}\n" +
                    "\\end{equation}\n"
                );
            } else {
                snippetEq = new vscode.SnippetString(
                    "\\begin{multline}\n" +
                    "  f(x) = a_0 + \\\\sum_{n=1}^{\\\\infty}\n" +
                    "  \\\\left(a_n \\\\cos(nx) + b_n \\\\sin(nx)\\\\right) " + latexNL() + "\n" +
                    "  + \\\\varepsilon\n" +
                    "\\end{multline}\n"
                );
            }
        }

        // ------------------------------------------------------------
        // ⚛️ Física (ejemplos)
        // ------------------------------------------------------------
        else if (categoria === categorias[4]) {
            await ensureAmsMath();

            const opciones = [
                "Segunda ley de Newton",
                "Ecuación de Schrödinger",
                "Ecuación de onda",
                "Maxwell (2 ecuaciones)"
            ];

            const picked = await vscode.window.showQuickPick(opciones, {
                placeHolder: "Selecciona un ejemplo de física"
            });

            if (!picked) return;

            if (picked === opciones[0]) {
                snippetEq = new vscode.SnippetString(
                    "\\begin{equation}\n" +
                    "  \\\\sum \\\\vec{F} = m \\\\sum \\\\vec{a}\n" +
                    "  \\\\label{eq:newton}\n" +
                    "\\end{equation}\n"
                );
            } else if (picked === opciones[1]) {
                snippetEq = new vscode.SnippetString(
                    "\\begin{equation}\n" +
                    "  i\\\\hbar \\\\frac{\\\\partial \\\\Psi}{\\\\partial t}\n" +
                    "  = -\\\\frac{\\\\hbar^2}{2m} \\\\nabla^2 \\\\Psi + V \\\\Psi\n" +
                    "  \\\\label{eq:schrodinger}\n" +
                    "\\end{equation}\n"
                );
            } else if (picked === opciones[2]) {
                snippetEq = new vscode.SnippetString(
                    "\\begin{equation}\n" +
                    "  \\\\nabla^2 u = \\\\frac{1}{c^2}\n" +
                    "  \\\\frac{\\\\partial^2 u}{\\\\partial t^2}\n" +
                    "  \\\\label{eq:onda}\n" +
                    "\\end{equation}\n"
                );
            } else {
                snippetEq = new vscode.SnippetString(
                    "\\begin{align}\n" +
                    "  \\\\nabla \\\\cdot \\\\vec{E} &= \\\\frac{\\\\rho}{\\\\varepsilon_0} " + latexNL() + "\n" +
                    "  \\\\nabla \\\\times \\\\vec{E} &= -\\\\frac{\\\\partial \\\\vec{B}}{\\\\partial t}\n" +
                    "\\end{align}\n"
                );
            }
        }

        if (!snippetEq) {
            return;
        }

        await editorEq.insertSnippet(snippetEq);
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
`% ====================================================
%   Configuración APA (LaTeXiS)
% ====================================================

\\usepackage[backend=biber,style=apa]{biblatex}
\\DeclareLanguageMapping{spanish}{spanish-apa}
\\usepackage{csquotes}

% Archivo(s) de bibliografía
\\addbibresource{${bibResource}}

% ====================================================
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
% ============================
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
    // Change citation style (BibLaTeX)
    // ============================================================
    const changeCitationStyle = vscode.commands.registerCommand(
        'latexis.changeCitationStyle',
        async () => {

            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage("No hay un editor activo.");
                return;
            }

            const mainDocument = await findMainTexDocument(editor.document);
            const mainText = mainDocument.getText();

            if (!mainText.includes("\\documentclass")) {
                vscode.window.showWarningMessage(
                    "No se encontró \\documentclass en el archivo principal."
                );
                return;
            }

            // Supported academic citation styles (BibLaTeX)
            const styleOptions: { label: string; value: string }[] = [
                { label: "APA (autor–año)", value: "apa" },
                { label: "IEEE (numérico)", value: "ieee" },
                { label: "Autor–Año (genérico)", value: "authoryear" },
                { label: "Numérico (genérico)", value: "numeric" },
                { label: "Chicago (autor–año)", value: "chicago-authordate" },
                { label: "Vancouver", value: "vancouver" }
            ];

            const picked = await vscode.window.showQuickPick(
                styleOptions.map(o => o.label),
                { placeHolder: "Selecciona el estilo de citación" }
            );

            if (!picked) {
                return;
            }

            const selected = styleOptions.find(o => o.label === picked);
            if (!selected) {
                return;
            }

            const style = selected.value;

            // Regex to find existing biblatex package
            // Supports both: \usepackage{biblatex} and \usepackage[...]{biblatex}
            const biblatexWithOptsRegex = /\\usepackage\s*\[([^\]]*)\]\s*\{biblatex\}/;
            const biblatexNoOptsRegex = /\\usepackage\s*\{biblatex\}/;

            let newText = mainText;

            if (biblatexWithOptsRegex.test(mainText)) {
                // Update only the style= option, preserving other options (e.g., backend=biber)
                newText = mainText.replace(
                    biblatexWithOptsRegex,
                    (_match, options: string) => {
                        const parts = options
                            .split(",")
                            .map(p => p.trim())
                            .filter(Boolean);

                        // Remove any existing style=...
                        const filtered = parts.filter(p => !p.startsWith("style="));

                        // Append the new style
                        filtered.push(`style=${style}`);

                        let rebuilt = `\\usepackage[${filtered.join(",")}]{biblatex}`;
                        if (style === "chicago-authordate") {
                            rebuilt += `
% Nota (LaTeXiS):
% El estilo Chicago suele usarse con citas en nota al pie.
% Considera usar:
% \\cite{}      resulta autor et al.
% \\textcite{}  resulta autor et al. (year)
% \\parencite{} resulta (autor et al. year)
% \\footcite{}  resulta nota al pie completa
% según el contexto.
`;
                        }
                        return rebuilt;
                    }
                );
            } else if (biblatexNoOptsRegex.test(mainText)) {
                // If biblatex exists without options, replace it with our canonical options
                newText = mainText.replace(
                    biblatexNoOptsRegex,
                    `\\usepackage[backend=biber,style=${style}]{biblatex}`
                );
            } else {
                // Insert biblatex after \\documentclass
                const lines = mainText.split("\n");
                let insertLine = 0;

                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes("\\documentclass")) {
                        insertLine = i + 1;
                        break;
                    }
                }

                const biblatexBlock =
`% ============================
%   Bibliografía (LaTeXiS)
% ============================
\\usepackage[backend=biber,style=${style}]{biblatex}

`;

                lines.splice(insertLine, 0, biblatexBlock);
                newText = lines.join("\n");
            }

            const edit = new vscode.WorkspaceEdit();
            edit.replace(
                mainDocument.uri,
                new vscode.Range(0, 0, mainDocument.lineCount, 0),
                newText
            );

            await vscode.workspace.applyEdit(edit);

            vscode.window.showInformationMessage(
                `Estilo de citación actualizado a: ${picked}`
            );
        }
    );
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

        // === VALIDATION 1: NO WORKSPACE (standalone file) ===
        if (!workspaceFolders) {
            if (!activeText.includes("\\documentclass")) {
                vscode.window.showWarningMessage(
                    "Este archivo no contiene \\documentclass. Abre la carpeta de tu proyecto para analizar múltiples archivos."
                );
                return;
            }
            // Special case: single-file with \documentclass → continue
        }

        // === VALIDATION 2: WORKSPACE MODE → locate main file ===
        let mainDocument = await findMainTexDocument(activeDocument);
        const mainText = mainDocument.getText();

        if (workspaceFolders && !mainText.includes("\\documentclass")) {
            vscode.window.showWarningMessage(
                "No se encontró el archivo principal con \\documentclass en este proyecto. Asegúrate de abrir la carpeta correcta."
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

    // Commands defined in package.json are registered here
    // commandId must match the identifier declared in package.json
    const disposable = vscode.commands.registerCommand('latexis.helloWorld', () => {
        vscode.window.showInformationMessage('Hello World from LaTeXiS!');
    });

// ------------------------------
// TABLE COMMANDS (NEW SYSTEM)
// ------------------------------
    // Command: paste simple table (TSV from clipboard)
    const cmdPasteSimple = vscode.commands.registerCommand(
        "latexis.pasteSimpleTable",
        async () => {
            await pasteSimpleTable();
        }
    );

    // Command: insert table from Excel file (xlsx)
    const cmdInsertExcel = vscode.commands.registerCommand(
        "latexis.insertExcelTable",
        async () => {
            await insertExcelTable();
        }
    );

    context.subscriptions.push(cmdPasteSimple);
    context.subscriptions.push(cmdInsertExcel);
    context.subscriptions.push(insertFigure);
    context.subscriptions.push(insertEquation);
    context.subscriptions.push(insertAPAConfig);
    context.subscriptions.push(changeCitationStyle);
    context.subscriptions.push(scanDocument);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
