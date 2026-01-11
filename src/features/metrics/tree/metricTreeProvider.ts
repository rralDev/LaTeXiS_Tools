/**
 * metricTreeProvider.ts
 *
 * Provee el Tree View para métricas de escritura académica.
 */

import * as vscode from "vscode";
import { MetricTreeItem } from "./metricTreeItem";
import { TrackerStorage } from "../tracker/trackerStorage";

export const METRICS_REFRESH_COMMAND = "latexIS.metrics.refresh";

export class MetricTreeProvider
  implements vscode.TreeDataProvider<MetricTreeItem>
{
  private _onDidChangeTreeData =
    new vscode.EventEmitter<MetricTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private readonly storage: TrackerStorage) {
    vscode.commands.registerCommand(
      METRICS_REFRESH_COMMAND,
      () => this.refresh()
    );
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: MetricTreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: MetricTreeItem): MetricTreeItem[] {
    const state = this.storage.loadState();
    const metrics = state.metrics;

    if (!element) {
      return [
        new MetricTreeItem(
          "Writing Metrics",
          "root",
          vscode.TreeItemCollapsibleState.Expanded
        ),
      ];
    }

    if (element.type === "root") {
      return [
        new MetricTreeItem(
          "Summary",
          "summary",
          vscode.TreeItemCollapsibleState.Expanded
        ),
      ];
    }

    if (element.type === "summary") {
      return [
        new MetricTreeItem(
          "Total words",
          "metric",
          vscode.TreeItemCollapsibleState.None,
          metrics.totalWords.toString()
        ),
        new MetricTreeItem(
          "Total sentences",
          "metric",
          vscode.TreeItemCollapsibleState.None,
          metrics.totalSentences.toString()
        ),
        new MetricTreeItem(
          "Total paragraphs",
          "metric",
          vscode.TreeItemCollapsibleState.None,
          metrics.totalParagraphs.toString()
        ),
      ];
    }

    return [];
  }
}