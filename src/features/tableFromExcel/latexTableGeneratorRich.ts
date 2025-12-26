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
        if (aligns.length === 0) {
            colAlign.push("c");
        }
        else {
            const f = { l: 0, c: 0, r: 0 };
            aligns.forEach(a => f[a]++);
            colAlign.push(Object.entries(f).sort((a, b) => b[1] - a[1])[0][0] as "l" | "c" | "r");
        }
    }

    let out = "";
    out += "\\begin{table}[hbtp]\n";
    out += "    \\centering\n";
    out += "    \\caption{Descripción de la tabla}\n";
    out += "    \\label{tab:excel-table}\n";
    out += "    \\begin{adjustbox}{max width=\\textwidth}\n";
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

        if (r === 0) {
            out += "    \\midrule\n";
        }
    }

    out += "    \\bottomrule\n";
    out += "    \\end{tabular}\n";
    out += "    \\end{adjustbox}\n";
    out += "\\end{table}\n";

    return out;
}

/** Format rich cell */
function formatRichCell(cell: RichCell | undefined): string {
    if (!cell) 
    {
        return "";
    }
    let text = escapeLatex(cell.text ?? "");

    if (cell.bold) {
        text = `\\textbf{${text}}`;
    }
    if (cell.italic) {
        text = `\\textit{${text}}`;
    }
    if (cell.underline) {
        text = `\\underline{${text}}`;
    }

    const fg = excelRgbToXcolor(cell.textColor);
    if (fg) {
        text = `\\textcolor[RGB]{${fg}}{${text}}`;
    }

    const bg = excelRgbToXcolor(cell.backgroundColor);
    if (bg) {
        text = `\\cellcolor[RGB]{${bg}} ${text}`;
    }

    return text;
}

/** Escape LaTeX */
function escapeLatex(t: string): string {
    return t.replace(/\\/g, "\\textbackslash{}");
}

/** Convert Excel RGB → r,g,b */
function excelRgbToXcolor(hex?: string): string | null {
    if (!hex)
    {
        return null;
    }
    let h = hex.replace(/^#/, "").trim();
    if (h.length === 8)
    {
        h = h.slice(2);
    }
    if (h.length !== 6)
    {
        return null;
    }

    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);

    return `${r},${g},${b}`;
}
export function generateRichLongtable(table: RichTable): string {
    if (!table || table.length === 0) {
        return "% Empty longtable";
    }

    const colCount = Math.max(...table.map(r => r.length));

    // Detect column alignment
    const colAlign: ("l" | "c" | "r")[] = [];
    for (let c = 0; c < colCount; c++) {
        const aligns = table
            .map(r => r[c]?.hAlign)
            .filter(Boolean) as ("l" | "c" | "r")[];

        if (aligns.length === 0) {
            colAlign.push("c");
        } else {
            const freq = { l: 0, c: 0, r: 0 };
            aligns.forEach(a => freq[a]++);
            colAlign.push(
                Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0] as "l" | "c" | "r"
            );
        }
    }

    let out = "";

    out += "\\begin{longtable}{" + colAlign.join("") + "}\n";
    out += "\\caption{Descripción de la tabla}\n";
    out += "\\label{tab:excel-table}\\\\\n\n";

    // -----------------------
    // HEADER (FIRST PAGE)
    // -----------------------
    out += "\\toprule\n";
    out += renderLongtableRow(table[0], colCount);
    out += "\\midrule\n";
    out += "\\endfirsthead\n\n";

    // -----------------------
    // HEADER (NEXT PAGES)
    // -----------------------
    out += "\\toprule\n";
    out += renderLongtableRow(table[0], colCount);
    out += "\\midrule\n";
    out += "\\endhead\n\n";

    // -----------------------
    // BODY
    // -----------------------
    for (let r = 1; r < table.length; r++) {
        out += renderLongtableRow(table[r], colCount);
    }

    out += "\\bottomrule\n";
    out += "\\end{longtable}\n";

    return out;
}

function renderLongtableRow(
    row: RichCell[],
    colCount: number
): string {
    const pieces: string[] = [];
    let skip = 0;

    for (let c = 0; c < colCount; c++) {
        if (skip > 0) {
            skip--;
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
        const align = cell.hAlign ?? "c";

        let tex = "";

        if (rowspan > 1 && colspan > 1) {
            tex = `\\multirow{${rowspan}}{*}{\\multicolumn{${colspan}}{${align}}{${content}}}`;
        } else if (colspan > 1) {
            tex = `\\multicolumn{${colspan}}{${align}}{${content}}`;
        } else if (rowspan > 1) {
            tex = `\\multirow{${rowspan}}{*}{${content}}`;
        } else {
            tex = content;
        }

        pieces.push(tex);
        skip = colspan - 1;
    }

    return "    " + pieces.join(" & ") + " \\\\\n";
}