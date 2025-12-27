import * as vscode from "vscode";

import { readClipboardPng } from "../utils/clipboardImage";
import { getUniqueClipboardImageName, savePngToImagesDir } from "../utils/imageManager";

function buildLatexFigure(fileNameOnly: string, baseNameForLabel: string): string {
    const labelSafe = (baseNameForLabel || "img").replace(/[^a-zA-Z0-9_\-]/g, "");

    return (
        "\\begin{figure}[hbtp]\n" +
        "    \\centering\n" +
        `    \\includegraphics[width=0.8\\textwidth]{${fileNameOnly}}\n` +
        "    \\caption{Descripción de la imagen}\n" +
        `    \\label{fig:${labelSafe}}\n` +
        "\\end{figure}\n"
    );
}

/**
 * Command: Insert image from clipboard
 * 1) Reads clipboard image as PNG
 * 2) Saves it to `<workspace>/img/<name>PP(_n).png`
 * 3) Inserts a LaTeX figure snippet referencing `img/<file>.png`
 */
export async function insertImageFromClipboard(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
    }

    // Ask for desired base name (optional)
    const baseNameInput = await vscode.window.showInputBox({
        title: "Guardar imagen desde portapapeles",
        prompt: "Nombre base (opcional). LaTeXiS agregará 'PP' y evitará sobrescritura.",
        placeHolder: "Ej: DiagramaArquitectura (se guardará como DiagramaArquitecturaPP.png)"
    });

    try {
        // Read clipboard image
        const pngBytes = await readClipboardPng();

        // Pick unique filename and save under img/
        const fileName = await getUniqueClipboardImageName(baseNameInput);
        const saved = await savePngToImagesDir(pngBytes, fileName);

        // Insert LaTeX code
        const labelBase = fileName.replace(/\.png$/i, "");
        const latex = buildLatexFigure(fileName, labelBase);

        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, latex);
        });

        vscode.window.showInformationMessage(
            `LaTeXiS: Imagen guardada en img/${fileName} y referenciada en el documento.`
        );
    } catch (err) {
        console.error("LaTeXiS: insertImageFromClipboard error:", err);
        vscode.window.showErrorMessage(
            "LaTeXiS: No se pudo insertar la imagen desde el portapapeles."
        );
    }
}
