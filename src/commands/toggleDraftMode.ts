import * as vscode from 'vscode';
import * as path from 'path';
import { DraftModeManager } from '../features/compileMode/draftModeManager';
import { CompileMode } from '../features/compileMode/compileModeModel';
import { buildWithFeedback } from '../utils/latexWorkshop';

/**
 * Singleton draft mode manager instance.
 * Keeps the draft mode state during the VS Code session.
 */
const draftModeManager = new DraftModeManager();

/**
 * Command entry point to toggle LaTeXiS draft compilation mode.
 *
 * This command:
 * - Detects the active editor and project root
 * - Enables or disables draft mode
 * - Triggers a LaTeX build using LaTeX Workshop
 * - Provides clear user feedback in Spanish
 */
export async function toggleDraftMode(): Promise<void> {
  try {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      vscode.window.showWarningMessage(
        'LaTeXiS: No hay ningún archivo activo.'
      );
      return;
    }

    const activeFilePath = editor.document.uri.fsPath;

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showWarningMessage(
        'LaTeXiS: No hay un proyecto abierto.'
      );
      return;
    }

    const projectRoot = workspaceFolders[0].uri.fsPath;
    const mainTexPath = path.join(projectRoot, 'main.tex');

    const currentConfig = draftModeManager.getCurrentConfig();

    if (currentConfig.mode === CompileMode.DRAFT) {
      // Disable draft mode
      draftModeManager.disableDraftMode(mainTexPath);

      vscode.window.showInformationMessage(
        'LaTeXiS: Modo borrador desactivado. Compilación normal restaurada.'
      );
    } else {
      // Enable draft mode
      const newConfig = draftModeManager.enableDraftMode(
        projectRoot,
        activeFilePath,
        mainTexPath
      );

      if (newConfig.mode !== CompileMode.DRAFT) {
        vscode.window.showWarningMessage(
          'LaTeXiS: No se pudo determinar el capítulo activo. Se mantiene la compilación normal.'
        );
        return;
      }

      vscode.window.showInformationMessage(
        `LaTeXiS: Modo borrador activado. Compilando solo el capítulo "${newConfig.activeChapter}".`
      );
    }

    // Trigger LaTeX build after mode change
    await buildWithFeedback();

  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    vscode.window.showErrorMessage(
      `LaTeXiS: Error al alternar el modo borrador. ${message}`
    );
  }
}