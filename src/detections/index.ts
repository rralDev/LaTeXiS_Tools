/**
 * index.ts — central export hub for all detection modules
 *
 * This file simply re-exports all detection routines so the extension
 * can import them from a single place.
 *
 * Keeping a dedicated index makes the detection system modular and
 * easily expandable (figures, tables, math, references, text, etc.)
 */

export { detectFigurePackages } from "./figures";
export { detectTablePackages } from "./tables";
export { detectMathPackages } from "./math";
export { detectReferencePackages } from "./references";
export { detectTextPackages } from "./text";