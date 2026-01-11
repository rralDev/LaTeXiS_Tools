/**
 * trackerStorage.ts
 *
 * Responsabilidad:
 *  - Persistir y recuperar métricas de escritura
 *  - Manejar reset y estado inicial
 *
 * Capa de storage pura (sin lógica de análisis).
 */

import { Memento } from "vscode";
import { WritingTrackerState, WritingMetrics } from "./trackerModel";

const STORAGE_KEY = "latexIS.writingMetrics";

export class TrackerStorage {
  constructor(private readonly storage: Memento) {}

  loadState(): WritingTrackerState {
    return (
      this.storage.get<WritingTrackerState>(STORAGE_KEY) ?? {
        metrics: this.createEmptyMetrics(),
        lastSnapshotHash: null,
      }
    );
  }

  saveState(state: WritingTrackerState): void {
    this.storage.update(STORAGE_KEY, state);
  }

  reset(): void {
    const emptyState: WritingTrackerState = {
      metrics: this.createEmptyMetrics(),
      lastSnapshotHash: null,
    };
    this.saveState(emptyState);
  }

  private createEmptyMetrics(): WritingMetrics {
    return {
      totalWords: 0,
      totalSentences: 0,
      totalParagraphs: 0,
      lastUpdated: Date.now(),
    };
  }
}
