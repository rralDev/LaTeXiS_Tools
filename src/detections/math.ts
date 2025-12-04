/**
 * math.ts — detections related to mathematical environments and commands
 *
 * This module analyzes LaTeX content for math-related features such as
 * equations, align environments, advanced math symbols, and unit formatting.
 * Each detection rule maps to one or more required LaTeX packages.
 *
 * The goal is to centralize all math detection logic in one maintainable place.
 */

export function detectMathPackages(content: string): Set<string> {
    const pkgs = new Set<string>();

    // --- 1) Detect align / split / gather (AMS environments) --------------
    // These require the amsmath package.
    if (
        content.includes("\\begin{align") ||
        content.includes("\\begin{split") ||
        content.includes("\\begin{gather")
    ) {
        pkgs.add("amsmath");
    }

    // --- 2) Detect use of ams symbols -------------------------------------
    // Commands like \mathbb{}, \mathfrak{}, \mathcal{} are typically provided
    // by the amssymb or amsfonts packages.
    if (
        content.includes("\\mathbb") ||
        content.includes("\\mathfrak") ||
        content.includes("\\mathcal")
    ) {
        pkgs.add("amssymb");
        pkgs.add("amsfonts");
    }

    // --- 3) Detect mathtools ----------------------------------------------
    // mathtools extends amsmath and is often required when using:
    // \coloneqq, \xRightarrow, \mathclap, etc.
    if (
        content.includes("\\coloneqq") ||
        content.includes("\\mathclap") ||
        content.includes("\\xRightarrow") ||
        content.includes("\\xLeftarrow")
    ) {
        pkgs.add("mathtools");
        pkgs.add("amsmath"); // dependency
    }

    // --- 4) Detect siunitx for physical units ------------------------------
    // The \SI{}{} and \si{} commands belong to the siunitx package.
    if (
        content.includes("\\SI{") ||
        content.includes("\\si{") ||
        content.includes("\\num{")
    ) {
        pkgs.add("siunitx");
    }

    // --- 5) Detect cases environment --------------------------------------
    // \begin{cases} is part of amsmath.
    if (content.includes("\\begin{cases")) {
        pkgs.add("amsmath");
    }

    return pkgs;
}
