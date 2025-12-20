/**
 * tables.ts — detections related to LaTeX table environments and formatting
 *
 * Este módulo analiza contenido LaTeX para detectar características
 * relacionadas con tablas: entornos tabulares, reglas avanzadas,
 * tablas largas, etc.
 *
 * Cada detección agrega uno o más paquetes necesarios.
 */

export function detectTablePackages(content: string): Set<string> {
    const pkgs = new Set<string>();

    // --- 1) Detectar entorno tabular estándar ------------------------------
    // \begin{tabular} es parte de LaTeX base, pero muchas veces se usa
    // booktabs para reglas mejoradas (\toprule, \midrule, etc.)
    if (content.includes("\\begin{tabular")) {
        // No se agrega paquete por defecto.
    }

    // --- 2) Detectar booktabs ------------------------------------------------
    // Reglas fáciles de detectar: \toprule, \midrule, \bottomrule
    if (
        content.includes("\\toprule") ||
        content.includes("\\midrule") ||
        content.includes("\\bottomrule")
    ) {
        pkgs.add("booktabs");
    }

    // --- 3) Detectar longtable ----------------------------------------------
    // Para tablas que atraviesan varias páginas
    if (content.includes("\\begin{longtable")) {
        pkgs.add("longtable");
    }

    // --- 4) Detectar tabularx ------------------------------------------------
    // Columnas flexibles con X
    if (content.includes("\\begin{tabularx")) {
        pkgs.add("tabularx");
    }

    // --- 4b) Detect tabular* (full-width tables in two-column layouts) -----
    // tabular* is provided by LaTeX core but usually paired with array.
    if (content.includes("\\begin{tabular*")) {
        pkgs.add("array");
    }

    // --- 5) Detectar multirow ------------------------------------------------
    // multirow permite celdas que ocupen varias filas
    if (content.includes("\\multirow")) {
        pkgs.add("multirow");
    }

    // --- 5b) Detect rotating tables ----------------------------------------
    // sidewaystable environment requires the rotating package.
    if (content.includes("\\begin{sidewaystable")) {
        pkgs.add("rotating");
    }

    // --- 6) Detectar multicolumn ---------------------------------------------
    // multicolumn es estándar, no requiere paquete externo,
    // pero muchas plantillas usan array.
    if (content.includes("\\multicolumn")) {
        pkgs.add("array");
    }

    // --- 6b) Detect advanced column types from array package -------------------
    // m{...}, p{...}, b{...} are extended column types requiring array package.
    if (
        content.includes("m{") ||
        content.includes("p{") ||
        content.includes("b{")
    ) {
        pkgs.add("array");
    }

    // --- 7) Detectar colortbl / xcolor para colorear tablas ------------------
    if (
        content.includes("\\rowcolor") ||
        content.includes("\\cellcolor") ||
        content.includes("\\columncolor")
    ) {
        pkgs.add("colortbl");
        pkgs.add("xcolor");
    }

    // --- 8) Detect threeparttable (table notes) -----------------------------
    // Common in academic and journal-quality tables.
    if (
        content.includes("\\begin{threeparttable") ||
        content.includes("\\tnote")
    ) {
        pkgs.add("threeparttable");
    }

    return pkgs;
}
