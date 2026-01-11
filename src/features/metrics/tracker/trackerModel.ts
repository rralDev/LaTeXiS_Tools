/**
 * trackerModel.ts
 *
 * Define los modelos de datos para el tracker de escritura académica.
 * No contiene lógica ni dependencias de VS Code.
 */

export interface WritingMetrics {
  /** Total acumulado de palabras */
  totalWords: number;

  /** Total acumulado de oraciones */
  totalSentences: number;

  /** Total acumulado de párrafos */
  totalParagraphs: number;

  /** Última actualización (timestamp) */
  lastUpdated: number;
}

export interface WritingMetricsDelta {
  /** Palabras añadidas desde la última medición */
  deltaWords: number;

  /** Oraciones añadidas desde la última medición */
  deltaSentences: number;

  /** Párrafos añadidos desde la última medición */
  deltaParagraphs: number;

  /** Timestamp de esta medición */
  timestamp: number;
}

/**
 * Estado completo del tracker para un documento o workspace.
 */
export interface WritingTrackerState {
  metrics: WritingMetrics;
  lastSnapshotHash: string | null;
}