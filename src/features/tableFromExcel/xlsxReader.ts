// src/features/tableFromExcel/xlsxReader.ts
import * as XLSX from "xlsx-js-style";
import type { RichTable, RichCell } from "../../models/tableTypes";

/**
 * Lee un buffer de Excel (.xlsx) y devuelve una RichTable con:
 *  - texto
 *  - negrita / cursiva / subrayado
 *  - color de texto / fondo (cuando viene en formato RGB)
 *  - alineación horizontal
 *  - colspan / rowspan para celdas combinadas
 */
export function readRichTableFromXlsxBuffer(
    data: Uint8Array,
    sheetIndex: number = 0
): RichTable {
    // Leemos el libro con estilos
    const workbook = XLSX.read(data, {
        type: "buffer",
        cellStyles: true
    } as any);

    const sheetName = workbook.SheetNames[sheetIndex];
    const sheet = workbook.Sheets[sheetName];

    if (!sheet || !sheet["!ref"]) {
        return [];
    }

    const range = XLSX.utils.decode_range(sheet["!ref"]);

    // --- Merges (colspan / rowspan, horizontales y verticales) ---
    const merges: any[] = (sheet as any)["!merges"] || [];
    const spanMap = new Map<string, { colspan: number; rowspan: number }>();
    const skipCells = new Set<string>();

    for (const m of merges) {
        const s = m.s; // start { r, c }
        const e = m.e; // end   { r, c }

        const colspan = e.c - s.c + 1;
        const rowspan = e.r - s.r + 1;
        const key = `${s.r}:${s.c}`;

        // Guardamos el span completo (horizontal y/o vertical) en la celda superior izquierda
        spanMap.set(key, { colspan, rowspan });

        // Marcamos todas las celdas cubiertas por este merge como "a saltar"
        for (let r = s.r; r <= e.r; r++) {
            for (let c = s.c; c <= e.c; c++) {
                if (r === s.r && c === s.c) {
                    continue; // celda principal
                }
                skipCells.add(`${r}:${c}`);
            }
        }
    }
    console.log("[LaTeXiS][merge] spanMap =", spanMap);
    console.log("[LaTeXiS][merge] skipCells =", skipCells);

    const table: RichTable = [];

    for (let R = range.s.r; R <= range.e.r; ++R) {
        const row: RichCell[] = [];

        for (let C = range.s.c; C <= range.e.c; ++C) {
            const key = `${R}:${C}`;

            if (skipCells.has(key)) {
                row.push({ text: "" });
                continue;
            }

            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            const cellObj: any = (sheet as any)[addr];
            // console.log("DEBUG CELL", addr, cellObj); // luego borrar

            const text =
                cellObj && cellObj.v !== null && cellObj.v !== undefined
                    ? String(cellObj.v).trim()
                    : "";

            const rich: RichCell = { text };

            // Estilos básicos (cuando existen)
            const s = (cellObj && cellObj.s) || {};
            const font = s.font || {};
            const align = s.alignment || {};
            const fill = s.fill || {};

            if (font.bold) {
                rich.bold = true;
            }
            if (font.italic) {
                rich.italic = true;
            }
            if (font.underline) {
                rich.underline = true;
            }

            // Alineación horizontal
            if (align.horizontal === "center") {
                rich.hAlign = "c";
            } else if (align.horizontal === "right") {
                rich.hAlign = "r";
            } else if (align.horizontal === "left") {
                rich.hAlign = "l";
            }

            // Color de texto (ARGB → RGB)
            const fontColor = font.color || {};
            let fgRgb: string | undefined = fontColor.rgb;
            if (fgRgb) {
                if (fgRgb.length === 8) {
                    fgRgb = fgRgb.substring(2);
                }
                rich.textColor = fgRgb;
            }

            // Color de fondo (ARGB → RGB)
            let fillFg =
                (fill.fgColor && fill.fgColor.rgb) ||
                (fill.bgColor && fill.bgColor.rgb);
            if (fillFg) {
                if (fillFg.length === 8) {
                    fillFg = fillFg.substring(2);
                }
                rich.backgroundColor = fillFg;
            }

            // Colspan / Rowspan si esta celda es inicio de un merge
            const span = spanMap.get(key);
            if (span) {
                if (span.colspan > 1) {
                    rich.colspan = span.colspan;
                }
                if (span.rowspan > 1) {
                    rich.rowspan = span.rowspan;
                }
            }

            row.push(rich);
        }

        // descartamos filas completamente vacías
        const hasContent = row.length > 0;  // nunca eliminar filas con merges
        if (hasContent) {
            table.push(row);
        }
    }

    return table;
}

/** Alias requerido por insertExcelTable.ts */
export function readXlsxRich(data: Uint8Array) {
    return readRichTableFromXlsxBuffer(data);
}