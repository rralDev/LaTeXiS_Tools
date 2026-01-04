import * as vscode from "vscode";
import * as path from "path";
import { findInsertionTarget, InsertionTargetKind } from "./latexInsertionTargets";

// ==============================================
// DIRECTORIES TO IGNORE COMPLETELY (A1 SELECTED)
// ==============================================
const FORBIDDEN_DIRS = [
    "build",
    "Build",
    "out",
    "output",
    "dist",
    "aux",
    ".aux",
    ".git",
    ".vscode",
    ".minted",
    "_minted",
    "node_modules",
    "__pycache__"
];

/**
 * Recursively scans a directory and returns all subfolders
 * that contain at least one valid image file.
 *
 * AVOIDING (A1):
 * - Forbidden system/temporary/compilation folders
 */
async function findImageFoldersRecursive(folder: vscode.Uri): Promise<Set<string>> {
    const result = new Set<string>();

    async function scan(dir: vscode.Uri) {
        const folderName = path.basename(dir.fsPath);

        // Skip forbidden folders
        if (FORBIDDEN_DIRS.includes(folderName)) {
            return;
        }

        let entries: [string, vscode.FileType][];
        try {
            entries = await vscode.workspace.fs.readDirectory(dir);
        } catch {
            return;
        }

        let containsImage = false;

        for (const [name, type] of entries) {
            const fullPath = vscode.Uri.joinPath(dir, name);

            if (type === vscode.FileType.File) {
                if (name.match(/\.(png|jpg|jpeg|pdf|eps)$/i)) {
                    containsImage = true;
                }
            } else if (type === vscode.FileType.Directory) {
                await scan(fullPath);
            }
        }

        if (containsImage) {
            const workspace = vscode.workspace.workspaceFolders?.[0];
            if (workspace) {
                const rel = vscode.workspace.asRelativePath(dir, false);
                result.add(rel.endsWith("/") ? rel : rel + "/");
            } else {
                const rel = path.basename(dir.fsPath) + "/";
                result.add(rel);
            }
        }
    }

    await scan(folder);
    return result;
}

/**
 * Ensures that \graphicspath{{...}{...}} exists and is updated
 * with ALL folders that contain images inside the workspace.
 */
export async function ensureGraphicspath(mainDoc: vscode.TextDocument): Promise<void> {
    try {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        let root: vscode.Uri;

        if (workspaceFolders && workspaceFolders.length > 0) {
            // Normal project mode
            root = workspaceFolders[0].uri;
        } else {
            // Single-file mode → use the directory of the main document
            const mainUri = mainDoc.uri;
            root = mainUri.with({ path: mainUri.path.replace(/[^/]+$/, "") });
        }

        // Discover all image folders recursively
        const allImageFolders = await findImageFoldersRecursive(root);

        // If nothing found, skip
        if (allImageFolders.size === 0) {
            return;
        }

        // Sort alphabetically for stable output
        const sorted = Array.from(allImageFolders).sort((a, b) => a.localeCompare(b));

        const graphicspathContent = sorted.map(p => `{${p}}`).join("");
        const correctSyntax = `\\graphicspath{${graphicspathContent}}`;

        // Determine the target document: prefer config.tex (workspace root) if it exists, else mainDoc
        let doc: vscode.TextDocument = mainDoc;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const workspaceRoot = workspaceFolders[0].uri;
            const configUri = vscode.Uri.joinPath(workspaceRoot, "config.tex");
            try {
                doc = await vscode.workspace.openTextDocument(configUri);
            } catch {
                // config.tex does not exist, fallback to mainDoc
            }
        }

        const originalLines = doc.getText().split("\n");

        // Remove existing \graphicspath lines (we will re-insert a single correct one)
        const cleanedLines = originalLines.filter(
            (line) => !/\\graphicspath\s*\{(?:\{[^}]*\})+\}/.test(line)
        );

        // Find \usepackage{graphicx} and insert graphicspath immediately after it
        let insertLine = -1;

        for (let i = 0; i < cleanedLines.length; i++) {
            if (/^\\usepackage\s*\{graphicx\}/.test(cleanedLines[i])) {
                insertLine = i + 1;
                break;
            }
        }

        // If graphicx is not found, do nothing (package insertion handles it)
        if (insertLine === -1) {
            return;
        }

        const finalLines = [
            ...cleanedLines.slice(0, insertLine),
            correctSyntax,
            ...cleanedLines.slice(insertLine)
        ];

        const edit = new vscode.WorkspaceEdit();
        edit.replace(
            doc.uri,
            new vscode.Range(0, 0, doc.lineCount, 0),
            finalLines.join('\n')
        );

        await vscode.workspace.applyEdit(edit);

    } catch (err) {
        vscode.window.showWarningMessage("LaTeXiS: No se pudo actualizar graphicspath.");
    }
}