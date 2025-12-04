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

    // --- 2) Detect figure environment -------------------------------------
    // Often redundant because \includegraphics is the true trigger,
    // but we include it for safety.
    if (content.includes("\\begin{figure")) {
        pkgs.add("graphicx");
    }

    // --- 3) Detect wrapfigure ---------------------------------------------
    // The wrapfig environment requires the wrapfig package.
    if (content.includes("wrapfigure")) {
        pkgs.add("wrapfig");
        pkgs.add("graphicx"); // wrapfig internally relies on graphicx
    }

    // --- 4) Detect subfigures ---------------------------------------------
    // If the project uses \subfloat or \subfigure, they belong to subfig.
    if (content.includes("\\subfloat") || content.includes("\\subfigure")) {
        pkgs.add("subfig");
        pkgs.add("graphicx");
    }

    // --- 5) Detect TikZ pictures ------------------------------------------
    // The tikzpicture environment requires the tikz package.
    if (content.includes("\\begin{tikzpicture")) {
        pkgs.add("tikz");
    }

    return pkgs;
}