/**
 * latexStripper.ts
 *
 * Responsabilidad:
 *  - Eliminar contenido LaTeX no relevante para métricas de escritura
 *  - Devolver texto plano apto para tokenización
 *
 * No tokeniza ni cuenta nada.
 */

export interface LatexStripOptions {
  removeCommands?: boolean;
  removeMath?: boolean;
  removeComments?: boolean;
  preserveLineBreaks?: boolean;
}

const DEFAULT_OPTIONS: Required<LatexStripOptions> = {
  removeCommands: true,
  removeMath: true,
  removeComments: true,
  preserveLineBreaks: true,
};

/**
 * Limpia texto LaTeX dejando solo contenido semántico de redacción.
 */
export function stripLatex(
  input: string,
  options: LatexStripOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let output = input;

  if (opts.removeComments) {
    output = stripComments(output);
  }

  if (opts.removeMath) {
    output = stripMath(output);
  }

  if (opts.removeCommands) {
    output = stripCommands(output);
  }

  output = normalizeWhitespace(output, opts.preserveLineBreaks);

  return output.trim();
}

/* ============================
 * Internals
 * ============================ */

/**
 * Elimina comentarios LaTeX (% ...)
 */
function stripComments(text: string): string {
  return text.replace(/(^|[^\\])%.*/g, "$1");
}

/**
 * Elimina expresiones matemáticas inline y display.
 */
function stripMath(text: string): string {
  let result = text;

  // Inline math: $...$
  result = result.replace(/\$[^$]*\$/g, " ");

  // Display math: \[ ... \]
  result = result.replace(/\\\[[\s\S]*?\\\]/g, " ");

  // Display math: $$ ... $$
  result = result.replace(/\$\$[\s\S]*?\$\$/g, " ");

  return result;
}

const STRUCTURAL_COMMANDS = [
  "part",
  "chapter",
  "section",
  "subsection",
  "subsubsection",
  "paragraph",
  "subparagraph",
  "title",
  "author",
  "date"
];

/**
 * Elimina comandos LaTeX conservando argumentos textuales cuando es razonable.
 * Cambios:
 * - Elimina completamente los comandos estructurales y su contenido.
 * - Para comandos sin espacios en argumento, elimina contenido dentro de llaves.
 * - Maneja la forma agrupada {\command texto} eliminando todo el grupo.
 */
function stripCommands(text: string): string {
  let result = text;

  // 1. Eliminar comandos estructurales COMPLETOS (incluyendo su argumento)
  for (const cmd of STRUCTURAL_COMMANDS) {
    const structuralRegex = new RegExp(
      `\\\\${cmd}\\s*(\\[[^\\]]*\\])?\\s*\\{[^}]*\\}`,
      "g"
    );
    result = result.replace(structuralRegex, " ");
  }

  // 2. Eliminar forma agrupada {\command ...} completamente
  result = result.replace(/\{\\[a-zA-Z*]+\s*[^}]*\}/g, " ");

  // 3. Eliminar comandos con argumento sin espacios en argumento (e.g. \command{arg}) eliminando contenido entre llaves
  result = result.replace(/\\[a-zA-Z*]+\s*\{[^}]*\}/g, " ");

  // 4. Eliminar comandos sin argumentos: \command
  result = result.replace(/\\[a-zA-Z*]+/g, " ");

  return result;
}

/**
 * Normaliza espacios y saltos de línea.
 */
function normalizeWhitespace(
  text: string,
  preserveLineBreaks: boolean
): string {
  if (preserveLineBreaks) {
    // Normaliza espacios dentro de líneas
    return text
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n");
  }

  return text.replace(/\s+/g, " ");
}
