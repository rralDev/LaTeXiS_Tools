import * as fs from 'fs';
import * as path from 'path';
import {
  AcademicProject,
  CreationMode
} from './projectScaffoldModel';

/**
 * Validates an AcademicProject model and resolves
 * creation-related decisions before scaffolding.
 *
 * This function:
 * - Does NOT create or modify files
 * - Only inspects the filesystem
 * - Ensures the model is coherent and safe to use
 *
 * Throws an Error if validation fails.
 */
export function validateAcademicProject(
  project: AcademicProject
): AcademicProject {
  // Validate project title
  if (!project.projectTitle || project.projectTitle.trim() === '') {
    throw new Error('El título del proyecto no puede estar vacío.');
  }

  // Validate directory name
  if (
    !project.projectDirectoryName ||
    project.projectDirectoryName.trim() === ''
  ) {
    throw new Error(
      'El nombre del directorio del proyecto no es válido.'
    );
  }

  // Validate base path
  if (!project.basePath || !fs.existsSync(project.basePath)) {
    throw new Error(
      'La ruta base seleccionada no existe.'
    );
  }

  const targetPath = path.join(
    project.basePath,
    project.projectDirectoryName
  );

  const targetExists = fs.existsSync(targetPath);

  // Resolve creation mode consistency
  if (!targetExists) {
    // Directory does not exist: force EMPTY mode
    return {
      ...project,
      creationMode: CreationMode.EMPTY
    };
  }

  // Directory exists: ensure a non-destructive mode is selected
  if (
    project.creationMode !== CreationMode.MERGE &&
    project.creationMode !== CreationMode.SUBFOLDER
  ) {
    throw new Error(
      'La carpeta del proyecto ya existe. Debe seleccionar un modo de creación válido.'
    );
  }

  return project;
}