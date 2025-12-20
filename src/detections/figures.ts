/**
 * figures.ts — detections related to figure and image commands
 *
 * This module identifies LaTeX commands used for inserting figures,
 * wrapping figures, subfigures, or drawing graphics. Each detection
 * maps to one or more LaTeX packages that should be included in the
 * document preamble.
 *
 * All comments are written in English for technical clarity. The idea
 * is that the detection rules remain simple, predictable, and easy to
 * extend in the future.
 */

export function detectFigurePackages(content: string): Set<string> {
    const pkgs = new Set<string>();

    // --- 1) Detect standard image insertion -------------------------------
    // \includegraphics requires the graphicx package.
    if (content.includes("\\includegraphics")) {
        pkgs.add("graphicx");
    }

    // --- 2b) Detect forced float placement [H] ---------------------------
    // The [H] specifier requires the float package.
    // We detect any figure or table environment that uses H (e.g. [H], [!H], [Htbp]).
    const forcedFloatRegex = /\\begin\{(figure|table)\}\[[^\]]*H[^\]]*\]/;
    if (forcedFloatRegex.test(content)) {
        pkgs.add("float");
    }

    // --- 3) Detect wrapfigure ---------------------------------------------
    // The wrapfig environment requires the wrapfig package.
    if (content.includes("\\begin{wrapfigure")) {
        pkgs.add("wrapfig");
        pkgs.add("graphicx"); // wrapfig internally relies on graphicx
    }

    // --- 3b) Detect SCfigure (side caption figures) ------------------------
    // The SCfigure environment is provided by the sidecap package.
    if (content.includes("\\begin{SCfigure")) {
        pkgs.add("sidecap");
        pkgs.add("graphicx");
    }

    // --- 4) Detect subfigures (legacy vs modern) ---------------------------
    // subcaption is the modern, recommended package.
    // subfig is legacy and should not be loaded together with subcaption.
    const usesLegacySubfig =
        content.includes("\\subfloat") || content.includes("\\subfigure");

    const usesModernSubcaption =
        content.includes("\\begin{subfigure") || content.includes("\\subcaption");

    if (usesModernSubcaption) {
        pkgs.add("subcaption");
        pkgs.add("graphicx");
    } else if (usesLegacySubfig) {
        pkgs.add("subfig");
        pkgs.add("graphicx");
    }

    // --- 5) Detect TikZ pictures ------------------------------------------
    // The tikzpicture environment requires the tikz package.
    if (content.includes("\\begin{tikzpicture")) {
        pkgs.add("tikz");
    }

    // --- 6) Detect pgfplots (scientific plots) ------------------------------
    // The axis environment is provided by the pgfplots package.
    if (content.includes("\\begin{axis")) {
        pkgs.add("pgfplots");
        pkgs.add("tikz"); // pgfplots depends on tikz
    }

    // --- 8) Detect figure* (full-width figures in two-column layouts) --------
    // figure* is core LaTeX but usually implies a two-column document.
    // No package is strictly required, but we ensure graphicx is present.
    if (content.includes("\\begin{figure*")) {
        pkgs.add("graphicx");
    }

    return pkgs;
}