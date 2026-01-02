/**
 * Normalizes a free-form project name into a safe directory name.
 *
 * Rules applied:
 * - Converts to lowercase
 * - Removes diacritics (accents)
 * - Replaces spaces with underscores
 * - Converts ñ to n
 * - Removes non-alphanumeric characters (except underscores)
 * - Collapses multiple underscores
 * - Trims leading/trailing underscores
 *
 * Example:
 *  "Tesis de Maestría en Ingeniería" -> "tesis_de_maestria_en_ingenieria"
 */
export function normalizeDirectoryName(input: string): string {
  if (!input) {
    return '';
  }

  return input
    .toLowerCase()
    // Normalize unicode characters and remove diacritics
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace Spanish ñ explicitly (after normalization safety)
    .replace(/ñ/g, 'n')
    // Replace spaces and hyphens with underscores
    .replace(/[\s\-]+/g, '_')
    // Remove any remaining invalid characters
    .replace(/[^a-z0-9_]/g, '')
    // Collapse multiple underscores
    .replace(/_+/g, '_')
    // Trim underscores from start and end
    .replace(/^_+|_+$/g, '');
}