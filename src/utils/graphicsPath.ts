import * as vscode from "vscode";
import * as path from "path";

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

        const text = mainDoc.getText();

        // Detect any existing graphicspath
        const regex = /\\graphicspath\s*\{(?:\{[^}]*\})+\}/;

        const edit = new vscode.WorkspaceEdit();

        if (!regex.test(text)) {
            // Insert AFTER \usepackage{graphicx}
            const lines = text.split("\n");
            let insertLine = 0;

            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes("\\usepackage{graphicx}")) {
                    insertLine = i + 1;
                    break;
                }
            }

            edit.insert(mainDoc.uri, new vscode.Position(insertLine, 0), correctSyntax + "\n");
        } else {
            // Replace the existing graphicspath block
            const updated = text.replace(regex, correctSyntax);

            edit.replace(
                mainDoc.uri,
                new vscode.Range(0, 0, mainDoc.lineCount, 0),
                updated
            );
        }

        await vscode.workspace.applyEdit(edit);

    } catch (err) {
        vscode.window.showWarningMessage("LaTeXiS: No se pudo actualizar graphicspath.");
    }
}