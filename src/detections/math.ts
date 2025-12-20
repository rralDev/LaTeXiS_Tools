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

    // --- 1) Detect AMS math environments ----------------------------------
    // These environments are provided by the amsmath package.
    if (
        content.includes("\\begin{align") ||
        content.includes("\\begin{align*") ||
        content.includes("\\begin{equation") ||
        content.includes("\\begin{equation*") ||
        content.includes("\\begin{split") ||
        content.includes("\\begin{gather") ||
        content.includes("\\begin{multline")
    ) {
        pkgs.add("amsmath");
    }

    // --- 2) Detect ams symbols (unequivocal) -------------------------------
    // \mathbb and \mathfrak require amssymb/amsfonts.
    if (
        content.includes("\\mathbb") ||
        content.includes("\\mathfrak")
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

    // --- 4) Detect physics package ----------------------------------------
    // Common in physics and engineering papers.
    // Commands like \qty, \dv, \pdv, \bra, \ket require the physics package.
    if (
        content.includes("\\qty") ||
        content.includes("\\dv") ||
        content.includes("\\pdv") ||
        content.includes("\\bra") ||
        content.includes("\\ket") ||
        content.includes("\\braket")
    ) {
        pkgs.add("physics");
        pkgs.add("amsmath"); // physics depends on amsmath
    }

    // --- 5) Detect siunitx for physical units ------------------------------
    // The \SI{}{} and \si{} commands belong to the siunitx package.
    if (
        content.includes("\\SI{") ||
        content.includes("\\si{") ||
        content.includes("\\num{")
    ) {
        pkgs.add("siunitx");
    }

    // --- 6) Detect cases environment --------------------------------------
    // \begin{cases} is part of amsmath.
    if (content.includes("\\begin{cases")) {
        pkgs.add("amsmath");
    }

    return pkgs;
}
