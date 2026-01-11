/**
 * metricTreeItem.ts
 *
 * Representación de un nodo en el Tree View de métricas.
 */

import * as vscode from "vscode";

export type MetricItemType =
  | "root"
  | "summary"
  | "metric";

export class MetricTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: MetricItemType,
    collapsibleState: vscode.TreeItemCollapsibleState,
    description?: string
  ) {
    super(label, collapsibleState);
    this.contextValue = type;
    this.description = description;
  }
}
