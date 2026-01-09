import * as vscode from 'vscode';
import {
  AcademicProject,
  CreationMode,
  DocumentType
} from '../projectScaffoldModel';
import { normalizeDirectoryName } from '../directoryNameNormalizer';
import { validateAcademicProject } from '../projectValidator';
import { generateScaffold } from '../scaffoldGenerator';

/**
 * VS Code command: Create a new academic project
 */
export async function createAcademicProject(): Promise<void> {
  try {
    // -----------------------------------------------------
    // Step 1: Select document type
    // -----------------------------------------------------

    const documentType = await askDocumentType();
    if (!documentType) {
      return;
    }

    // -----------------------------------------------------
    // Step 2: Project title
    // -----------------------------------------------------

    const projectTitle = await vscode.window.showInputBox({
      prompt: 'Ingrese el título del proyecto académico',
      ignoreFocusOut: true
    });

    if (!projectTitle) {
      vscode.window.showWarningMessage(
        'Creación de proyecto cancelada: título no proporcionado.'
      );
      return;
    }

    // -----------------------------------------------------
    // Step 3: Base directory
    // -----------------------------------------------------

    const basePathUris = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Seleccionar carpeta base'
    });

    if (!basePathUris || basePathUris.length === 0) {
      vscode.window.showWarningMessage(
        'Creación de proyecto cancelada: no se seleccionó carpeta base.'
      );
      return;
    }

    const basePath = basePathUris[0].fsPath;

    // -----------------------------------------------------
    // Step 4: Directory name
    // -----------------------------------------------------

    const suggestedDirName = normalizeDirectoryName(projectTitle);

    const projectDirectoryName = await vscode.window.showInputBox({
      prompt: 'Nombre del directorio del proyecto',
      value: suggestedDirName,
      ignoreFocusOut: true
    });

    if (!projectDirectoryName) {
      vscode.window.showWarningMessage(
        'Creación de proyecto cancelada: nombre de directorio no proporcionado.'
      );
      return;
    }

    // -----------------------------------------------------
    // Step 5: Creation mode
    // -----------------------------------------------------

    const creationMode = await askCreationMode();
    if (!creationMode) {
      return;
    }

    // -----------------------------------------------------
    // Build project model
    // -----------------------------------------------------

    const project: AcademicProject = {
      documentType,
      projectTitle,
      projectDirectoryName,
      basePath,
      creationMode
    };

    // -----------------------------------------------------
    // Validate project
    // -----------------------------------------------------

    validateAcademicProject(project);

    // -----------------------------------------------------
    // Generate scaffold
    // -----------------------------------------------------

    // Resolve extension path dynamically (works in dev and production)
    const extension = vscode.extensions.all.find(
      ext => ext.packageJSON?.name === 'latexis'
    );

    if (!extension) {
      throw new Error('No se pudo determinar la ruta de la extensión.');
    }

    const targetPath = generateScaffold(
      project,
      extension.extensionPath
    );

    vscode.window.showInformationMessage(
      `Proyecto académico creado correctamente en:\n${targetPath}`
    );

    // -----------------------------------------------------
    // Optionally open the new project
    // -----------------------------------------------------

    const openProject = await vscode.window.showQuickPick(
      ['Sí', 'No'],
      {
        placeHolder: '¿Desea abrir el proyecto recién creado?'
      }
    );

    if (openProject === 'Sí') {
      await vscode.commands.executeCommand(
        'vscode.openFolder',
        vscode.Uri.file(targetPath),
        true
      );
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);

    vscode.window.showErrorMessage(
      `Error al crear el proyecto académico: ${message}`
    );
  }
}

/**
 * Prompts the user to select the document type.
 */
async function askDocumentType(): Promise<DocumentType | undefined> {
  const selection = await vscode.window.showQuickPick(
    [
      {
        label: 'Tesis / Libro',
        description: 'Documento largo con capítulos',
        value: DocumentType.BOOK_THESIS
      },
      {
        label: 'Artículo',
        description: 'Artículo académico o paper',
        value: DocumentType.ARTICLE
      }
    ],
    {
      placeHolder: 'Seleccione el tipo de documento'
    }
  );

  return selection?.value;
}

/**
 * Prompts the user to select the project creation mode.
 */
async function askCreationMode(): Promise<CreationMode | undefined> {
  const selection = await vscode.window.showQuickPick(
    [
      {
        label: 'Crear en carpeta vacía',
        description: 'La carpeta debe no existir',
        value: CreationMode.EMPTY
      },
      {
        label: 'Fusionar con carpeta existente',
        description: 'No se sobrescriben archivos',
        value: CreationMode.MERGE
      },
      {
        label: 'Crear subcarpeta automáticamente',
        description: 'Se genera una carpeta sin conflictos',
        value: CreationMode.SUBFOLDER
      }
    ],
    {
      placeHolder: 'Seleccione el modo de creación del proyecto'
    }
  );

  return selection?.value;
}