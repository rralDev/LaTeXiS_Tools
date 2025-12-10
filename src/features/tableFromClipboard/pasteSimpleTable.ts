type Cell = any; // TEMPORARY: allows compilation until RichCell interface is defined
import * as vscode from "vscode";
import { parseTsvTable } from "./tsvParser";
import { generateSimpleLatexTable } from "./latexTableGeneratorSimple";
import { findMainTexDocument } from "../../extension";
import { ensurePackage } from "../../utils/packages";

/**
 * Lee texto del portapapeles (TSV) y pega una tabla LaTeX sencilla.
 */
export async function pasteSimpleTable(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("LaTeXiS: No hay un editor activo.");
        return;
    }

    // === Insert booktabs in main.tex if available ===
    try {
        const activeDoc = editor.document;
        const mainDoc = await findMainTexDocument(activeDoc);

        // Si el archivo principal tiene \documentclass,
        // se fuerza la inclusión del paquete booktabs.
        const mainText = mainDoc.getText();
        if (/\\documentclass/.test(mainText)) {
            await ensurePackage(mainDoc, "booktabs");
        }
    } catch (err) {
        console.warn("LaTeXiS: No se pudo garantizar booktabs:", err);
    }

    const clipboardText = await vscode.env.clipboard.readText();

    if (!clipboardText) {
        vscode.window.showWarningMessage("LaTeXiS: El portapapeles está vacío.");
        return;
    }

    const table = parseTsvTable(clipboardText);

    if (!table) {
        vscode.window.showWarningMessage(
            "LaTeXiS: El portapapeles no parece contener una tabla (texto con tabulaciones)."
        );
        return;
    }

    const latex = generateSimpleLatexTable(table);
    const annotated =
        "% LaTeXiS: Tabla pegada desde portapapeles (simple)\n" + latex + "\n";

    await editor.insertSnippet(new vscode.SnippetString(annotated));
}