import { SimpleCell } from "../../models/tableTypes";

/**
 * Generador de tablas *simples* desde TSV (texto del portapapeles).
 * Usa siempre estilo booktabs: \toprule, \midrule, \bottomrule.
 * La PRIMERA FILA se considera encabezado.
 */
export function generateSimpleLatexTable(table: SimpleCell[][]): string {
    if (!table || table.length === 0) {
        return "% Empty table";
    }

    // Detect automatic alignment per column
    function detectColumnAlignment(table: SimpleCell[][]): ("l" | "c" | "r")[] {
        const colCount = Math.max(...table.map(r => r.length));
        const alignments: ("l" | "c" | "r")[] = [];

        for (let col = 0; col < colCount; col++) {
            let numbers = 0;
            let text = 0;

            for (let row = 0; row < table.length; row++) {
                const cell = table[row][col];
                if (!cell) continue;
                const value = (cell.text ?? "").trim();

                // Consider numeric if valid float or int
                if (/^[+-]?\d+([.,]\d+)?$/.test(value)) {
                    numbers++;
                } else {
                    text++;
                }
            }

            if (numbers > text) {
                alignments.push("r"); // numeric → right align
            } else if (text > numbers) {
                alignments.push("l"); // mostly text → left align
            } else {
                alignments.push("c"); // tie → center
            }
        }
        return alignments;
    }

    // Escape characters that break LaTeX compilation
    function escapeLatexSafe(text: string): string {
        const replacements: [RegExp, string][] = [
            [/\\/g, "\\textbackslash{}"],
            [/&/g, "\\&"],
            [/%/g, "\\%"],
            [/\$/g, "\\$"],
            [/#/g, "\\#"],
            [/_/g, "\\_"],
            [/{/g, "\\{"],
            [/}/g, "\\}"],
            [/~/g, "\\textasciitilde{}"],
            [/\^/g, "\\textasciicircum{}"]
        ];

        let result = text;
        for (const [regex, replacement] of replacements) {
            result = result.replace(regex, replacement);
        }
        return result;
    }

    // Por ahora todas centradas. Luego podemos hacer heurísticas si quieres.
    const alignment = detectColumnAlignment(table);
    const colSpec = alignment.join("");

    let latex = "% LaTeXiS: Tabla ingresada desde portapapeles\n";
    latex += "\\begin{tabular}{" + colSpec + "}\n";
    latex += "\\toprule\n";

    table.forEach((row, rowIndex) => {
        const cells = row.map(cell => escapeLatexSafe((cell?.text ?? "").trim()));
        latex += cells.join(" & ") + " \\\\\\\\ \n";

        // Después de la PRIMERA fila (encabezado) insertamos \midrule
        if (rowIndex === 0 && table.length > 1) {
            latex += "\\midrule\n";
        }
    });

    latex += "\\bottomrule\n";
    latex += "\\end{tabular}";
    return latex;
}