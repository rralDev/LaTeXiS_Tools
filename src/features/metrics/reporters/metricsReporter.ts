/**
 * metricsReporter.ts
 *
 * Genera reportes de métricas de escritura en formato Markdown.
 * Capa pasiva: no accede a VS Code directamente.
 */

import { WritingMetrics } from "../tracker/trackerModel";

export class MetricsReporter {
  static generateMarkdown(metrics: WritingMetrics): string {
    return [
      "# Writing Metrics",
      "",
      `- **Total words:** ${metrics.totalWords}`,
      `- **Total sentences:** ${metrics.totalSentences}`,
      `- **Total paragraphs:** ${metrics.totalParagraphs}`,
      "",
      `_Last updated: ${new Date(metrics.lastUpdated).toLocaleString()}_`,
    ].join("\n");
  }
}