// src/features/tableFromExcel/latexTableGeneratorRich.ts

import type { RichTable, RichCell } from "../../models/tableTypes";

/**
 * LaTeX rich table generator with:
 *  - colspan
 *  - rowspan (multirow)
 *  - combined colspan+rowspan
 *  - alignment l/c/r
 *  - text / background color
 *  - booktabs (toprule / midrule / bottomrule)
 *  - correct tablegenerator.com style output
 */
export function generateRichLatexTable(table: RichTable): string {
    if (!table || table.length === 0) {
        return "% Empty rich table";
    }

    const colCount = Math.max(...table.map(r => r.length));
    const covered = new Set<string>();

    // Detect alignment for each column
    const colAlign: ("l" | "c" | "r")[] = [];
    for (let col = 0; col < colCount; col++) {
        const aligns = table.map(r => r[col]?.hAlign).filter(Boolean) as ("l" | "c" | "r")[];
        if (aligns.length === 0) colAlign.push("c");
        else {
            const f = { l: 0, c: 0, r: 0 };
            aligns.forEach(a => f[a]++);
            colAlign.push(Object.entries(f).sort((a, b) => b[1] - a[1])[0][0] as "l" | "c" | "r");
        }
    }

    let out = "";
    out += "\\begin{table}[hbtp]\n";
    out += "    \\centering\n";
    out += "    \\caption{Título de la tabla}\n";
    out += "    \\label{tab:excel-table}\n";
    out += "    \\begin{tabular}{" + colAlign.join("") + "}\n";
    out += "    \\toprule\n";

    for (let r = 0; r < table.length; r++) {
        const row = table[r];
        const pieces: string[] = [];

        for (let c = 0; c < colCount; c++) {
            const key = `${r},${c}`;
            if (covered.has(key)) {
                pieces.push(""); 
                continue;
            }

            const cell = row[c];

            if (!cell) {
                pieces.push("");
                continue;
            }

            const colspan = cell.colspan ?? 1;
            const rowspan = cell.rowspan ?? 1;
            const content = formatRichCell(cell);

            const align = (cell.hAlign ?? colAlign[c]);

            let tex = "";

            // -------------------------
            // 1) BOTH rowspan + colspan
            // -------------------------
            if (rowspan > 1 && colspan > 1) {
                tex = `\\multirow{${rowspan}}{*}{\\multicolumn{${colspan}}{${align}}{${content}}}`;
            }

            // -------------------------
            // 2) ONLY colspan
            // -------------------------
            else if (colspan > 1) {
                tex = `\\multicolumn{${colspan}}{${align}}{${content}}`;
            }

            // -------------------------
            // 3) ONLY rowspan
            // -------------------------
            else if (rowspan > 1) {
                tex = `\\multirow{${rowspan}}{*}{${content}}`;
            }

            // -------------------------
            // 4) NORMAL CELL
            // -------------------------
            else {
                tex = content;
            }

            pieces.push(tex);

            // Register covered cells
            for (let rr = r; rr < r + rowspan; rr++) {
                for (let cc = c; cc < c + colspan; cc++) {
                    if (!(rr === r && cc === c)) {
                        covered.add(`${rr},${cc}`);
                    }
                }
            }

            c += colspan - 1;
        }

        out += "    " + pieces.join(" & ") + " \\\\ \n";

        if (r === 0) out += "    \\midrule\n";
    }

    out += "    \\bottomrule\n";
    out += "    \\end{tabular}\n";
    out += "\\end{table}\n";

    return out;
}

/** Format rich cell */
function formatRichCell(cell: RichCell | undefined): string {
    if (!cell) return "";
    let text = escapeLatex(cell.text ?? "");

    if (cell.bold) text = `\\textbf{${text}}`;
    if (cell.italic) text = `\\textit{${text}}`;
    if (cell.underline) text = `\\underline{${text}}`;

    const fg = excelRgbToXcolor(cell.textColor);
    if (fg) text = `\\textcolor[RGB]{${fg}}{${text}}`;

    const bg = excelRgbToXcolor(cell.backgroundColor);
    if (bg) text = `\\cellcolor[RGB]{${bg}} ${text}`;

    return text;
}

/** Escape LaTeX */
function escapeLatex(t: string): string {
    return t.replace(/\\/g, "\\textbackslash{}");
}

/** Convert Excel RGB → r,g,b */
function excelRgbToXcolor(hex?: string): string | null {
    if (!hex) return null;
    let h = hex.replace(/^#/, "").trim();
    if (h.length === 8) h = h.slice(2);
    if (h.length !== 6) return null;

    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);

    return `${r},${g},${b}`;
}