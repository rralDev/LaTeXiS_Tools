/**
 * text.ts — detections related to general text commands
 *
 * These detectors focus on LaTeX commands that influence text formatting,
 * paragraphs, spacing, quotes, etc. Each detector receives a full string
 * of LaTeX content and returns a set of package names that should be added.
 *
 * This module is intentionally simple for now — we start small and expand
 * as needed. Everything is fully documented so you understand how detection works.
 */

export function detectTextPackages(content: string): Set<string> {
    const pkgs = new Set<string>();

    // --- 1) Detect use of \lipsum (dummy text) ----------------------------
    // \lipsum belongs to the "lipsum" package.
    if (content.includes("\\lipsum")) {
        pkgs.add("lipsum");
    }

    // --- 2) Detect use of microtypography ---------------------------------
    // Commands like \textls or \SetTracking belong to microtype.
    if (content.includes("\\textls") || content.includes("\\SetTracking")) {
        pkgs.add("microtype");
    }

    // --- 3) Detect nice quotes --------------------------------------------
    // csquotes provides \enquote and advanced quoting tools.
    if (content.includes("\\enquote{")) {
        pkgs.add("csquotes");
    }

    // --- 4) Detect ragged formatting (ragged2e) ----------------------------
    // \RaggedRight, \Centering, etc.
    if (content.includes("\\RaggedRight") || content.includes("\\Centering")) {
        pkgs.add("ragged2e");
    }

    return pkgs;
}