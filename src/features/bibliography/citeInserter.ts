import * as vscode from "vscode";
import { ensurePackage } from "../../utils/packages";
import { findMainTexDocument } from "../../extension";

/**
 * Inserts a citation command at the cursor.
 * Supports BibLaTeX commands.
 */
export async function insertCitation(citeKey: string): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
    }

    const mainDoc = await findMainTexDocument(editor.document);

    // Ensure biblatex is loaded
    await ensurePackage(mainDoc, "biblatex");

    const citeTypes = [
        { label: "\\autocite", description: "Cita automática (recomendada, sensible al estilo)" },
        { label: "\\textcite", description: "Cita textual: Autor (Año)" },
        { label: "\\parencite", description: "Cita entre paréntesis: (Autor, Año)" },
        { label: "\\cite", description: "Cita genérica (uso avanzado / legado)" }
    ];

    const picked = await vscode.window.showQuickPick(citeTypes, {
        placeHolder: "Selecciona el tipo de cita"
    });

    if (!picked) {
        return;
    }

    const snippet = new vscode.SnippetString(
        `${picked.label}{${citeKey}}`
    );

    editor.insertSnippet(snippet);
}