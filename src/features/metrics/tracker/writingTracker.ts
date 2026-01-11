/**
 * writingTracker.ts
 *
 * Responsabilidad:
 *  - Coordinar el pipeline de métricas de escritura
 *  - Calcular métricas básicas (palabras, oraciones, párrafos)
 *  - Gestionar actualización incremental mediante snapshot
 *
 * No maneja UI ni eventos de VS Code.
 */

import { stripLatex } from "../core/latexStripper";
import { tokenizeText } from "../core/textTokenizer";
import {
  WritingTrackerState,
  WritingMetrics,
  WritingMetricsDelta,
} from "./trackerModel";

export interface WritingTrackerResult {
  metrics: WritingMetrics;
  delta: WritingMetricsDelta;
}

export class WritingTracker {
  private state: WritingTrackerState;

  constructor(initialState: WritingTrackerState) {
    this.state = initialState;
  }

  /**
   * Procesa texto LaTeX y actualiza métricas.
   */
  processText(latexSource: string): WritingTrackerResult {
    const cleaned = stripLatex(latexSource);
    const tokenized = tokenizeText(cleaned);

    const currentMetrics: WritingMetrics = {
      totalWords: tokenized.words.length,
      totalSentences: tokenized.sentences.length,
      totalParagraphs: tokenized.paragraphs.length,
      lastUpdated: Date.now(),
    };

    const delta: WritingMetricsDelta = {
      deltaWords:
        currentMetrics.totalWords - this.state.metrics.totalWords,
      deltaSentences:
        currentMetrics.totalSentences -
        this.state.metrics.totalSentences,
      deltaParagraphs:
        currentMetrics.totalParagraphs -
        this.state.metrics.totalParagraphs,
      timestamp: Date.now(),
    };

    this.state = {
      metrics: currentMetrics,
      lastSnapshotHash: this.computeSnapshotHash(cleaned),
    };

    return { metrics: currentMetrics, delta };
  }

  getState(): WritingTrackerState {
    return this.state;
  }

  /**
   * Hash simple para detectar cambios relevantes.
   */
  private computeSnapshotHash(text: string): string {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }
}