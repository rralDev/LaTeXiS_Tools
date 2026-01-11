/**
 * textTokenizer.ts
 *
 * Responsibility:
 *  - Convert plain text into structural units:
 *    words, sentences, and paragraphs
 *  - Preserve basic offsets for future navigation features
 *
 * This module is language-agnostic and does not understand
 * LaTeX semantics or advanced linguistic rules.
 */

export interface TokenizedText {
  words: Token[];
  sentences: Token[];
  paragraphs: Token[];
}

export interface Token {
  text: string;
  start: number;
  end: number;
}

/**
 * Tokenizes plain text into words, sentences, and paragraphs.
 */
export function tokenizeText(input: string): TokenizedText {
  if (input.trim().length === 0) {
    return { words: [], sentences: [], paragraphs: [] };
  }

  const paragraphs = tokenizeParagraphs(input);
  const sentences = paragraphs.flatMap(p =>
    tokenizeSentences(p.text, p.start)
  );
  const words = sentences.flatMap(s =>
    tokenizeWords(s.text, s.start)
  );

  return { words, sentences, paragraphs };
}

/* ============================
 * Internals
 * ============================ */

function tokenizeParagraphs(text: string): Token[] {
  const result: Token[] = [];
  const parts = text.split(/\n\s*\n/);

  let cursor = 0;

  for (const part of parts) {
    const start = text.indexOf(part, cursor);
    const end = start + part.length;
    cursor = end;

    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    if (!/[a-zA-ZÀ-ÿ]{3,}/.test(trimmed)) continue;

    result.push({
      text: trimmed,
      start,
      end,
    });
  }

  return result;
}

function tokenizeSentences(text: string, offset: number): Token[] {
  const result: Token[] = [];
  const punctuationRegex = /[.!?]/g;

  let lastCut = 0;
  let match: RegExpExecArray | null;

  const isUpper = (c: string) =>
    c.toUpperCase() === c && c.toLowerCase() !== c;
  const isLower = (c: string) =>
    c.toLowerCase() === c && c.toUpperCase() !== c;
  const isDigit = (c: string) => /\d/.test(c);

  while ((match = punctuationRegex.exec(text)) !== null) {
    const idx = match.index;

    const lookaheadRaw = text.slice(idx + 1);
    const lookaheadTrim = lookaheadRaw.trimStart();
    const spaces =
      lookaheadRaw.length - lookaheadTrim.length;

    const prevSlice = text.slice(Math.max(0, idx - 10), idx);
    const prevTokenMatch = prevSlice.match(/(\p{L}+|\d+)$/u);
    const prevToken = prevTokenMatch ? prevTokenMatch[1] : "";

    let entropyScore = 0;

    // Hard guard: ignore punctuation as sentence boundary if prevToken length <= 3 and both prevToken and lookaheadTrim[0] start with uppercase
    if (
      prevToken.length <= 3 &&
      prevToken.length > 0 &&
      isUpper(prevToken[0]) &&
      lookaheadTrim.length > 0 &&
      isUpper(lookaheadTrim[0])
    ) {
      continue;
    }

    // A) Espacios / saltos → ruptura informativa
    if (spaces >= 1) entropyScore += 1;
    if (spaces >= 2 || lookaheadRaw.startsWith("\n")) entropyScore += 2;

    // B) Token previo largo → cierre semántico
    if (prevToken.length >= 5) entropyScore += 2;

    // C) Iniciales tipo "A." → baja información
    if (prevToken.length === 1 && prevToken === prevToken.toUpperCase()) {
      entropyScore -= 2;
    }

    // D) Decimales → patrón ultra predecible
    const prevChar = text[idx - 1] ?? "";
    const nextChar = text[idx + 1] ?? "";
    if (isDigit(prevChar) && isDigit(nextChar)) {
      entropyScore -= 3;
    }

    // E) Análisis del siguiente símbolo
    if (lookaheadTrim.length > 0) {
      const next = lookaheadTrim[0];

      // Inicio de oración típico
      if (isUpper(next)) entropyScore += 2;

      // Comando LaTeX → ruptura fuerte
      if (next === "\\") entropyScore += 2;

      // minúscula inmediata → continuidad
      if (isLower(next)) entropyScore -= 2;
    }

    // F) Longitud mínima del segmento
    const segment = text.slice(lastCut, idx + 1).trim();
    const wordCount = segment.split(/\s+/).length;
    if (wordCount >= 5) entropyScore += 1;
    if (wordCount < 3) entropyScore -= 2;

    // --- Decisión final ---
    if (entropyScore >= 3) {
      if (/[a-zA-ZÀ-ÿ]{3,}/.test(segment)) {
        result.push({
          text: segment,
          start: offset + lastCut,
          end: offset + idx + 1,
        });
        lastCut = idx + 1;
      }
    }
  }

  // Cola final sin puntuación terminal
  const tail = text.slice(lastCut).trim();
  if (tail.length > 0 && /[a-zA-ZÀ-ÿ]{3,}/.test(tail)) {
    result.push({
      text: tail,
      start: offset + lastCut,
      end: offset + lastCut + tail.length,
    });
  }

  return result;
}

function tokenizeWords(text: string, offset: number): Token[] {
  const result: Token[] = [];

  // Regex designed to match:
  //  - Words (Unicode letters)
  //  - Numbers with decimal separators and thousands separators using "." or ","
  //    (e.g. 3.1415, 125,153.14, 125.153,14)
  //  - Simple numeric tokens
  //
  // Note:
  //  - Thousand separators using spaces are resolved in a post-processing merge step.
  const wordOrNumberRegex =
    /\b(?:\p{L}+|\p{N}{1,3}(?:[.,]\p{N}{3})+(?:[.,]\p{N}+)?|\p{N}+(?:[.,]\p{N}+)?|')+\b/gu;

  let match: RegExpExecArray | null;

  while ((match = wordOrNumberRegex.exec(text)) !== null) {
    const tokenText = match[0];
    const start = offset + match.index;
    const end = start + tokenText.length;
    result.push({ text: tokenText, start, end });
  }

  // Post-processing: merge numeric groups separated by spaces or non-breaking spaces.
  //
  // Examples:
  //  - "125 153.14"   -> single numeric token
  //  - "1 234 567,89" -> single numeric token
  //
  // Rules:
  //  - current token: 1–3 digits
  //  - next token: starts with exactly 3 digits and may continue with (.,) + digits
  //  - characters between tokens must be whitespace only (including NBSP)
  const merged: Token[] = [];
  const isShortGroup = (s: string) => /^\d{1,3}$/.test(s);
  const isNextGroup = (s: string) => /^\d{3}(?:[.,]\d+)*$/.test(s);

  for (let i = 0; i < result.length; i++) {
    let current = result[i];

    // Attempt to merge multiple consecutive numeric groups
    while (i + 1 < result.length) {
      const next = result[i + 1];
      const between = text.slice(current.end - offset, next.start - offset);

      // Only if between tokens is whitespace (including NBSP)
      if (!/^[\s\u00A0]+$/.test(between)) break;

      // Only if both tokens are compatible numeric groups
      if (!isShortGroup(current.text)) break;
      if (!isNextGroup(next.text)) break;

      const newStart = current.start;
      const newEnd = next.end;
      const newText = text.slice(newStart - offset, newEnd - offset);
      current = { text: newText, start: newStart, end: newEnd };

      i++; // Consume `next`
    }

    merged.push(current);
  }

  return merged;
}