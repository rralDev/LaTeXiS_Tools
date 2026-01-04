import * as vscode from "vscode";

import { RichTable } from "../../models/tableTypes";
import { generateRichLatexTable, generateRichLongtable } from "./latexTableGeneratorRich";
import { ensurePackage } from "../../utils/packages";
import { readXlsxRich } from "./xlsxReader";
import { findMainTexDocument, findPackageTargetDocument } from "../../utils/latexDocuments";

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

    if (!fileUris || fileUris.length === 0) {
        return;
    }

    const excelUri = fileUris[0];

    try {
        // Read file bytes
        const data = await vscode.workspace.fs.readFile(excelUri);

        // Parse FULL rich table (formato, colores, merges, etc.)
        const richTable: RichTable = readXlsxRich(data);
        // console.log("RICH TABLE DEBUG:", JSON.stringify(richTable, null, 2)); \\luego se Borra

        const layoutOptions = [
            "Normal (ajustar al ancho)",
            "Tabla larga (continúa en varias páginas)",
            "Tabla muy ancha (landscape)",
            "Larga + landscape"
        ];

        const layout = await vscode.window.showQuickPick(layoutOptions, {
            placeHolder: "Selecciona el formato de la tabla"
        });

        if (!layout) {
            return;
        }

        const layoutKey = layout.toLowerCase();
        const useLongtable = layoutKey.includes("larga");
        const useLandscape = layoutKey.includes("landscape");


        // Ensure required LaTeX packages exist
        const mainDocument = await findMainTexDocument(editor.document);
        const targetDocument = await findPackageTargetDocument(mainDocument);

        await ensurePackage(targetDocument, "booktabs");
        await ensurePackage(targetDocument, "multirow");
        await ensurePackage(targetDocument, "colortbl");
        await ensurePackage(targetDocument, "xcolor");
        await ensurePackage(targetDocument, "adjustbox");

        if (useLongtable) {
            await ensurePackage(targetDocument, "longtable");
        }
        if (layout.includes("landscape")) {
            await ensurePackage(targetDocument, "pdflscape");
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        let shownPath = excelUri.fsPath;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const root = workspaceFolders[0].uri.fsPath;
            if (shownPath.startsWith(root)) {
                shownPath = shownPath.substring(root.length + 1);
            }
        }

        let tableLatex = generateRichLatexTable(richTable);
        // OPTION 4 (EARLY): Larga + landscape
        // Generate longtable directly to preserve page breaks
        if (useLongtable && useLandscape) {
            tableLatex = generateRichLongtable(richTable);
        }
        // OPTION 2: Tabla larga (longtable)
        // Use the dedicated generator to avoid backslash (\\ vs \\\\) corruption and to support proper longtable structure.
        if (useLongtable && !useLandscape) {
            tableLatex = generateRichLongtable(richTable);
        }
        // Add longtable footer: continuation notice on every page except last
        if (useLongtable) {
            const columnCount = Math.max(...richTable.map(r => r.length));

            tableLatex = tableLatex.replace(
                /\\endhead\s*\n/,
                "\\endhead\n" +
                "\\midrule\n" +
                `\\multicolumn{${columnCount}}{c}{\\textit{Continúa en la siguiente página}}\\\\\n` +
                "\\endfoot\n" +
                "\\bottomrule\n" +
                "\\endlastfoot\n"
            );
        }

        // Fix longtable caption spacing: only one line break after label, not after caption
        if (useLongtable && !useLandscape) {
            tableLatex = tableLatex
                // remove \\ after \caption{...}
                .replace(/(\\caption\{[^}]*\})\\\\/g, "$1")
                // ensure exactly one \\ after \label{...}
                .replace(/(\\label\{[^}]*\})(?:\\\\)?/g, "$1\\\\");
        }

        // Remove adjustbox ALWAYS before layout decisions
        tableLatex = tableLatex
            .replace(/\\begin\{adjustbox\}\{[^}]*\}\s*/g, "")
            .replace(/\s*\\end\{adjustbox\}/g, "");

        // OPTION 1: Normal (ajustar al ancho)
        // Do NOT manipulate strings with regex (causes \\ bugs)
        // Rely on generator structure: table -> tabular
        if (!useLongtable && !useLandscape) {
            tableLatex = tableLatex.replace(
                /\\begin\{tabular\}\{([^}]*)\}/,
                "\\begin{adjustbox}{max width=\\textwidth}\n\\begin{tabular}{$1}"
            );

            tableLatex = tableLatex.replace(
                /\\end\{tabular\}/,
                "\\end{tabular}\n\\end{adjustbox}"
            );
        }

        // OPTION 3: Tabla muy ancha (landscape, una sola página)
        if (!useLongtable && useLandscape) {
            // Wrap tabular with adjustbox using landscape width (\linewidth)
            tableLatex = tableLatex.replace(
                /\\begin\{tabular\}\{([^}]*)\}/,
                "\\begin{adjustbox}{max width=\\linewidth}\n\\begin{tabular}{$1}"
            );

            tableLatex = tableLatex.replace(
                /\\end\{tabular\}/,
                "\\end{tabular}\n\\end{adjustbox}"
            );
        }


        // Final wrapping rules:
        //
        // 1) tabular is already wrapped by adjustbox INSIDE table (from generator)
        // 2) NEVER place table inside adjustbox (LaTeX error: Not in outer par mode)
        // 3) landscape may wrap table or longtable safely

        if (useLandscape && !useLongtable) {
            // OPTION 3: landscape + table/tabular
            tableLatex =
                `\\begin{landscape}\n` +
                tableLatex +
                `\n\\end{landscape}`;
        }

        if (useLandscape && useLongtable) {
            // OPTION 4: landscape + longtable
            tableLatex =
                `\\begin{landscape}\n` +
                tableLatex +
                `\n\\end{landscape}`;
        }

        const latex =
            `% LaTeXiS: Tabla ingresada desde Excel\n` +
            `% Ruta: ${shownPath}\n` +
            tableLatex;

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
