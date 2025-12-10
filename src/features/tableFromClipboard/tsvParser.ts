// src/features/tableFromClipboard/tsvParser.ts
import type { SimpleCell, SimpleTable } from "../../models/tableTypes";

/**
 * Convierte texto con tabulaciones (TSV) en una matriz SimpleTable.
 * Devuelve null si el texto no parece ser una tabla.
 */
export function parseTsvTable(text: string): SimpleTable | null {
    const trimmed = text.trim();
    if (!trimmed) {
        return null;
    }

    // Normalizamos saltos de línea
    const lines = trimmed
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        .split("\n")
        .filter(line => line.length > 0);

    if (lines.length === 0) {
        return null;
    }

    const table: SimpleTable = lines.map(line => {
        const cols = line.split("\t");
        const row: SimpleCell[] = cols.map(col => ({
            text: col.trim()
        }));
        return row;
    });

    return table;
}