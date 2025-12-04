/**
 * references.ts — detections related to citations, bibliography and cross-references
 *
 * This module analyzes LaTeX content to determine which packages are needed
 * when the user employs citation commands, bibliography environments, or
 * reference commands.
 *
 * Examples:
 *  - \cite{}, \parencite{}, \textcite{}  → require biblatex (or natbib)
 *  - \autoref{}, \cref{}                 → require hyperref or cleveref
 *  - \printbibliography                  → requires biblatex
 *  - \bibliography{} / thebibliography   → may require natbib
 *
 * Each detection returns a Set<string> with the appropriate packages.
 */

export function detectReferencePackages(content: string): Set<string> {
    const pkgs = new Set<string>();

    // --- 1) Detect biblatex features ---------------------------------------
    // If the user employs commands from biblatex, ensure biblatex package.
    if (
        content.includes("\\cite{") ||
        content.includes("\\parencite{") ||
        content.includes("\\textcite{") ||
        content.includes("\\printbibliography")
    ) {
        pkgs.add("biblatex");
    }

    // --- 2) Detect old-style LaTeX bibliography ----------------------------
    // Using \bibliography or thebibliography environment suggests natbib.
    if (
        content.includes("\\bibliography{") ||
        content.includes("\\begin{thebibliography}")
    ) {
        pkgs.add("natbib");
    }

    // --- 3) Detect reference enhancement commands --------------------------
    // hyperref provides \autoref{}, colored links, PDF metadata, etc.
    if (
        content.includes("\\autoref{") ||
        content.includes("\\url{") ||
        content.includes("\\href{")
    ) {
        pkgs.add("hyperref");
    }

    // --- 4) Detect cleveref (more advanced cross-references) ---------------
    if (
        content.includes("\\cref{") ||
        content.includes("\\Cref{")
    ) {
        pkgs.add("cleveref");
        pkgs.add("hyperref"); // cleveref depends strongly on hyperref
    }

    // --- 5) Detect biblatex data sources -----------------------------------
    // \addbibresource{file.bib}
    if (content.includes("\\addbibresource{")) {
        pkgs.add("biblatex");
    }

    return pkgs;
}