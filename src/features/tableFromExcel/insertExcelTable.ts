import * as vscode from "vscode";

import { RichTable } from "../../models/tableTypes";
import { generateRichLatexTable } from "./latexTableGeneratorRich";
import { ensurePackage } from "../../utils/packages";
import { readXlsxRich } from "./xlsxReader";

/**
 * Step 2 of the RICH workflow:
 * - Ask user for an Excel file (.xlsx)
 * - Use xlsxReader to extract FULL rich formatting (colors, bold, italics, merges)
 * - Generate final LaTeX rich table
 */
export async function insertExcelTable(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
    }

    // Ask user to pick Excel file
    const fileUris = await vscode.window.showOpenDialog({
        title: "Selecciona un archivo Excel (.xlsx)",
        canSelectMany: false,
        filters: { "Excel Files": ["xlsx"] }
    });

    if (!fileUris || fileUris.length === 0) return;

    const excelUri = fileUris[0];

    try {
        // Read file bytes
        const data = await vscode.workspace.fs.readFile(excelUri);

        // Parse FULL rich table (formato, colores, merges, etc.)
        const richTable: RichTable = readXlsxRich(data);
        // console.log("RICH TABLE DEBUG:", JSON.stringify(richTable, null, 2)); \\luego se Borra

        // Ensure required LaTeX packages exist
        const mainDoc = editor.document;
        await ensurePackage(mainDoc, "booktabs");
        await ensurePackage(mainDoc, "xcolor");
        await ensurePackage(mainDoc, "colortbl");
        await ensurePackage(mainDoc, "multirow");

        // Generate LaTeX with format
        const workspaceFolders = vscode.workspace.workspaceFolders;
        let shownPath = excelUri.fsPath;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const root = workspaceFolders[0].uri.fsPath;
            if (shownPath.startsWith(root)) {
                shownPath = shownPath.substring(root.length + 1);
            }
        }
        const latex =
            `% LaTeXiS: Tabla ingresada desde Excel\n` +
            `% Ruta: ${shownPath}\n` +
            generateRichLatexTable(richTable);

        // Insert as literal text (NO SnippetString → preserves backslashes)
        await editor.edit(editBuilder => {
            editBuilder.insert(editor.selection.active, latex + "\n");
        });

        vscode.window.showInformationMessage("LaTeXiS: Tabla Excel fue insertada correctamente.");

    } catch (err) {
        console.error("ERROR leyendo Excel:", err);
        vscode.window.showErrorMessage("LaTeXiS: Error al procesar el archivo Excel.");
    }
}
