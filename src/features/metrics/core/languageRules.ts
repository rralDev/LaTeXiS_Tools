/**
 * languageRules.ts
 *
 * Responsabilidad:
 *  - Definir reglas lingüísticas mínimas por idioma
 *  - Proveer helpers para tokenización y métricas
 *
 * No contiene lógica de VS Code ni análisis pesado.
 */

export type SupportedLanguage = "es" | "en";

export interface LanguageRules {
  sentenceEndings: RegExp;
  wordPattern: RegExp;
  paragraphSeparator: RegExp;
  minWordLength: number;
}

const ES_RULES: LanguageRules = {
  sentenceEndings: /[.!?¿¡]+/g,
  wordPattern: /\b[\p{L}\p{N}']+\b/gu,
  paragraphSeparator: /\n\s*\n/,
  minWordLength: 2,
};

const EN_RULES: LanguageRules = {
  sentenceEndings: /[.!?]+/g,
  wordPattern: /\b[\p{L}\p{N}']+\b/gu,
  paragraphSeparator: /\n\s*\n/,
  minWordLength: 2,
};

const RULES_BY_LANGUAGE: Record<SupportedLanguage, LanguageRules> = {
  es: ES_RULES,
  en: EN_RULES,
};

/**
 * Devuelve las reglas lingüísticas para el idioma indicado.
 * Fallback seguro a inglés.
 */
export function getLanguageRules(
  language: SupportedLanguage | undefined
): LanguageRules {
  if (!language) {
    return EN_RULES;
  }

  return RULES_BY_LANGUAGE[language] ?? EN_RULES;
}
