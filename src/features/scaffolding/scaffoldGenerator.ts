import * as fs from 'fs';
import * as path from 'path';
import {
  AcademicProject,
  CreationMode,
  DocumentType
} from './projectScaffoldModel';

/**
 * Generates the academic project structure on disk
 * based on a validated AcademicProject model.
 *
 * This function:
 * - Creates directories and files
 * - Never overwrites existing content
 * - Applies MERGE / SUBFOLDER strategies
 * - Uses filesystem templates
 *
 * Note:
 * - This module must NOT depend on VS Code APIs.
 * - Template resolution must work in both dev and packaged extension.
 */
export function generateScaffold(
  project: AcademicProject,
  extensionPath: string
): string {
  const baseTargetPath = path.join(
    project.basePath,
    project.projectDirectoryName
  );

  // Resolve final target path based on creation mode
  const targetPath =
    project.creationMode === CreationMode.SUBFOLDER
      ? resolveSubfolderPath(baseTargetPath)
      : baseTargetPath;

  // Ensure base project directory exists
  ensureDirectory(targetPath);

  // Generate structure based on document type
  switch (project.documentType) {
    case DocumentType.ARTICLE:
      generateFromTemplate(targetPath, 'article', extensionPath);
      break;

    case DocumentType.REPORT:
      generateFromTemplate(targetPath, 'report', extensionPath);
      break;

    case DocumentType.BOOK_THESIS:
      generateFromTemplate(targetPath, 'bookThesis', extensionPath);
      break;

    default:
      throw new Error('Tipo de documento no soportado.');
  }

  // Copy shared assets (figures, logos, etc.)
  copySharedAssets(targetPath, extensionPath);

  return targetPath;
}

/**
 * Resolves a non-conflicting subfolder path by appending
 * an incremental suffix if needed.
 *
 * Example:
 *  project -> project_1 -> project_2
 */
function resolveSubfolderPath(basePath: string): string {
  let counter = 1;
  let candidate = `${basePath}_${counter}`;

  while (fs.existsSync(candidate)) {
    counter++;
    candidate = `${basePath}_${counter}`;
  }

  return candidate;
}

/**
 * Ensures a directory exists.
 * Creates it recursively if missing.
 */
function ensureDirectory(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Generates files and folders from a template directory.
 *
 * Existing files are never overwritten.
 */
function generateFromTemplate(
  targetPath: string,
  templateName: string,
  extensionPath: string
): void {
  const templateRoot = resolveTemplateRoot(extensionPath, templateName);

  if (!templateRoot) {
    throw new Error(`No se encontró la plantilla: ${templateName}`);
  }

  copyRecursive(templateRoot, targetPath);
}

/**
 * Resolves the template folder path.
 *
 * Templates are always loaded from:
 * resources/templates/<templateName>
 *
 * This works for both development and packaged extensions.
 */
function resolveTemplateRoot(
  extensionPath: string,
  templateName: string
): string | null {
  const templatePath = path.join(
    extensionPath,
    'resources',
    'templates',
    templateName
  );

  if (fs.existsSync(templatePath)) {
    return templatePath;
  }

  return null;
}

/**
 * Recursively copies template files and folders
 * into the target directory.
 *
 * Files are copied only if they do not already exist.
 */
function copyRecursive(source: string, destination: string): void {
  const stats = fs.statSync(source);

  if (stats.isDirectory()) {
    ensureDirectory(destination);

    const entries = fs.readdirSync(source);
    for (const entry of entries) {
      const srcPath = path.join(source, entry);
      const destPath = path.join(destination, entry);
      copyRecursive(srcPath, destPath);
    }
  } else {
    // File: copy only if it does not exist
    if (!fs.existsSync(destination)) {
      fs.copyFileSync(source, destination);
    }
  }
}

/**
 * Copies shared assets (e.g. figures, logos) into the project.
 *
 * Assets are loaded from:
 * resources/assets/figures
 *
 * Files are never overwritten.
 */
function copySharedAssets(
  targetPath: string,
  extensionPath: string
): void {
  const sharedFiguresPath = path.join(
    extensionPath,
    'resources',
    'assets',
    'figures'
  );

  if (!fs.existsSync(sharedFiguresPath)) {
    return;
  }

  const targetFiguresPath = path.join(targetPath, 'figures');
  ensureDirectory(targetFiguresPath);

  const entries = fs.readdirSync(sharedFiguresPath);
  for (const entry of entries) {
    const srcPath = path.join(sharedFiguresPath, entry);
    const destPath = path.join(targetFiguresPath, entry);

    if (!fs.existsSync(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}