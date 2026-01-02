import * as vscode from 'vscode';

/**
 * Utility wrapper for interacting with LaTeX Workshop.
 *
 * This module intentionally keeps the integration minimal.
 * It does NOT manage recipes, settings, or compilation logic.
 * Its only responsibility is to trigger builds and provide
 * safe checks around LaTeX Workshop availability.
 */

/**
 * Checks whether LaTeX Workshop is installed and available.
 */
export function isLatexWorkshopAvailable(): boolean {
  return !!vscode.extensions.getExtension(
    'James-Yu.latex-workshop'
  );
}

/**
 * Triggers a LaTeX build using LaTeX Workshop.
 *
 * This uses the built-in command exposed by the extension:
 *   latex-workshop.build
 *
 * No assumptions are made about recipes or configuration.
 */
export async function triggerLatexBuild(): Promise<void> {
  if (!isLatexWorkshopAvailable()) {
    throw new Error(
      'La extensión LaTeX Workshop no está instalada.'
    );
  }

  await vscode.commands.executeCommand(
    'latex-workshop.build'
  );
}

/**
 * Triggers a LaTeX build and provides user feedback.
 *
 * This helper is intended to be called from commands,
 * not from feature logic.
 */
export async function buildWithFeedback(): Promise<void> {
  try {
    await triggerLatexBuild();
    vscode.window.showInformationMessage(
      'LaTeXiS: Se inició la compilación LaTeX (LaTeX Workshop).'
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    vscode.window.showWarningMessage(
      `LaTeXiS: No se pudo iniciar la compilación LaTeX. ${message}`
    );
  }
}