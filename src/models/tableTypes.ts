// src/models/tableTypes.ts

// Celda “simple”: solo texto
export interface SimpleCell {
    text: string;
}

// Matriz de celdas simples
export type SimpleTable = SimpleCell[][];

// (Preparado para el futuro: tabla rica)
export interface RichCell extends SimpleCell {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    textColor?: string;
    backgroundColor?: string;
    hAlign?: "l" | "c" | "r";
    /** Número de columnas que esta celda abarca (para \multicolumn) */
    colspan?: number;

    /** Número de filas que esta celda abarca (para \multirow — futuro uso) */
    rowspan?: number;
}

export type RichTable = RichCell[][];