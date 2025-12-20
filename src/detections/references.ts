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

    // --- 1) Detect modern biblatex-based workflows -------------------------
    // biblatex is the modern, flexible backend used for APA, IEEE, Chicago, etc.
    const usesBiblatexCommands =
        content.includes("\\parencite{") ||
        content.includes("\\textcite{") ||
        content.includes("\\autocite{") ||
        content.includes("\\printbibliography") ||
        content.includes("\\addbibresource{");

    // --- 2) Detect legacy natbib-based workflows ---------------------------
    // natbib is older and typically used with \\bibliography or numeric styles.
    const usesNatbibCommands =
        content.includes("\\bibliography{") ||
        content.includes("\\begin{thebibliography}") ||
        content.includes("\\citep{") ||
        content.includes("\\citet{");

    // Prefer biblatex when both are detected (modern > legacy)
    if (usesBiblatexCommands) {
        pkgs.add("biblatex");
    } else if (usesNatbibCommands) {
        pkgs.add("natbib");
    }

    // --- 3) Detect hyperref (links, URLs, PDF metadata) --------------------
    if (
        content.includes("\\href{") ||
        content.includes("\\url{") ||
        content.includes("\\hyperref[") ||
        content.includes("\\autoref{")
    ) {
        pkgs.add("hyperref");
    }

    // --- 4) Detect cleveref (enhanced cross-references) --------------------
    if (
        content.includes("\\cref{") ||
        content.includes("\\Cref{")
    ) {
        pkgs.add("cleveref");
        pkgs.add("hyperref"); // cleveref depends on hyperref
    }

    return pkgs;
}