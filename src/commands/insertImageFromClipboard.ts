import * as path from "path";
import * as vscode from "vscode";
import { execFile } from "child_process";
import { promisify } from "util";

import { ensureGraphicspath } from "../utils/graphicsPath";
import { findMainTexDocument } from "../utils/latexDocuments";

const execFileAsync = promisify(execFile);

const FORBIDDEN_IMAGE_DIRS = [
    "build",
    "Build",
    "out",
    "output",
    "dist",
    "img", // legacy dir we no longer want to pick automatically
    ".git",
    ".vscode",
    "aux",
    ".aux",
    ".minted",
    "_minted",
    "node_modules",
    "__pycache__"
];

function sanitizeBaseName(name: string | undefined): string {
    const trimmed = (name || "").trim();
    const safe = trimmed.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-]/g, "");
    return safe.length ? safe : "img";
}

async function exists(uri: vscode.Uri): Promise<boolean> {
    try {
        await vscode.workspace.fs.stat(uri);
        return true;
    } catch {
        return false;
    }
}

async function getUniquePngName(imageDir: vscode.Uri, baseNameInput?: string): Promise<string> {
    const base = sanitizeBaseName(baseNameInput);
    const baseWithPP = base === "img" && !(baseNameInput || "").trim() ? "img_PP" : `${base}_PP`;

    let candidate = `${baseWithPP}.png`;
    let i = 2;
    while (await exists(vscode.Uri.joinPath(imageDir, candidate))) {
        candidate = `${baseWithPP}_${i}.png`;
        i++;
    }
    return candidate;
}

/**
 * Reads clipboard image as PNG bytes.
 *
 * Notes:
 * - macOS: uses `pngpaste -` (recommended). If not installed, returns null.
 * - Windows: uses PowerShell Get-Clipboard -Format Image -> PNG -> Base64.
 * - Linux: uses `xclip -selection clipboard -t image/png -o`.
 */
async function readClipboardPngBytes(): Promise<Uint8Array | null> {
    try {
        if (process.platform === "darwin") {
            // Requires: brew install pngpaste
            const { stdout } = await execFileAsync("pngpaste", ["-"] as any, {
                encoding: "buffer",
                maxBuffer: 50 * 1024 * 1024
            } as any);
            const buf = stdout as unknown as Buffer;
            return buf.length ? new Uint8Array(buf) : null;
        }

        if (process.platform === "win32") {
            const ps = [
                "Add-Type -AssemblyName System.Windows.Forms;",
                "$img = [Windows.Forms.Clipboard]::GetImage();",
                "if ($null -eq $img) { exit 2 }",
                "$ms = New-Object System.IO.MemoryStream;",
                "$img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png);",
                "$bytes = $ms.ToArray();",
                "$b64 = [Convert]::ToBase64String($bytes);",
                "Write-Output $b64;"
            ].join(" ");

            const { stdout } = await execFileAsync(
                "powershell",
                ["-NoProfile", "-NonInteractive", "-Command", ps] as any,
                { maxBuffer: 50 * 1024 * 1024 }
            );

            const b64 = (stdout || "").toString().trim();
            if (!b64) return null;
            return new Uint8Array(Buffer.from(b64, "base64"));
        }

        // linux / others
        const { stdout } = await execFileAsync("xclip", ["-selection", "clipboard", "-t", "image/png", "-o"] as any, {
            encoding: "buffer",
            maxBuffer: 50 * 1024 * 1024
        } as any);

        const buf = stdout as unknown as Buffer;
        return buf.length ? new Uint8Array(buf) : null;
    } catch {
        return null;
    }
}

function buildLatexFigure(fileNameOnly: string, baseNameForLabel: string): string {
    const labelSafe = (baseNameForLabel || "img").replace(/[^a-zA-Z0-9_\-]/g, "");

    return (
        "\\begin{figure}[hbtp]\n" +
        "    \\centering\n" +
        `    \\includegraphics[width=0.5\\textwidth]{${fileNameOnly}}\n` +
        "    \\caption{Descripción de la imagen}\n" +
        `    \\label{fig:${labelSafe}}\n` +
        "\\end{figure}\n"
    );
}

/**
 * Command: Insert image from clipboard
 * 1) Finds an existing image directory or creates "figures/"
 * 2) Saves clipboard image as PNG into that directory
 * 3) Inserts a LaTeX figure snippet referencing the saved file
 */
export async function insertImageFromClipboard(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage("No active editor.");
        return;
    }

    const workspace = vscode.workspace.workspaceFolders?.[0];
    if (!workspace) {
        vscode.window.showErrorMessage("LaTeXiS: No active workspace found.");
        return;
    }

    const root = workspace.uri;

    let imageDir: vscode.Uri | null = null;

    // 1️⃣ Prefer existing "figures" directory explicitly
    const figuresDir = vscode.Uri.joinPath(root, "figures");
    if (await exists(figuresDir)) {
        imageDir = figuresDir;
    }

    // 2️⃣ Otherwise, find the first valid image directory (excluding forbidden ones)
    if (!imageDir) {
        const entries = await vscode.workspace.fs.readDirectory(root);
        for (const [name, type] of entries) {
            if (type !== vscode.FileType.Directory) continue;
            if (FORBIDDEN_IMAGE_DIRS.includes(name.toLowerCase())) continue;

            const dirUri = vscode.Uri.joinPath(root, name);
            try {
                const files = await vscode.workspace.fs.readDirectory(dirUri);
                const hasImages = files.some(([f, t]) => t === vscode.FileType.File && /\.(png|jpg|jpeg|pdf|eps)$/i.test(f));
                if (hasImages) {
                    imageDir = dirUri;
                    break;
                }
            } catch {
                // ignore
            }
        }
    }

    // 3️⃣ If none exists, create figures/
    if (!imageDir) {
        imageDir = figuresDir;
        if (!(await exists(imageDir))) {
            await vscode.workspace.fs.createDirectory(imageDir);
        }
    }

    // Ask for desired base name (optional)
    const baseNameInput = await vscode.window.showInputBox({
        title: "Insertar imagen desde portapapeles",
        prompt: "Nombre base (opcional). Se usará para el archivo de imagen y etiqueta.",
        placeHolder: "Ej: DiagramaArquitectura"
    });

    // Read clipboard PNG
    const pngBytes = await readClipboardPngBytes();
    if (!pngBytes) {
        const hint =
            process.platform === "darwin"
                ? "En macOS instala 'pngpaste' (brew install pngpaste) y vuelve a intentar."
                : process.platform === "win32"
                    ? "Asegúrate de tener una imagen en el portapapeles."
                    : "En Linux instala 'xclip' y vuelve a intentar.";

        vscode.window.showErrorMessage(`LaTeXiS: No se encontró una imagen en el portapapeles. ${hint}`);
        return;
    }

    // Save into selected dir
    const fileName = await getUniquePngName(imageDir, baseNameInput);
    const destUri = vscode.Uri.joinPath(imageDir, fileName);
    await vscode.workspace.fs.writeFile(destUri, pngBytes);

    // Insert LaTeX snippet
    const labelBase = fileName.replace(/\.[^/.]+$/, "");
    const latex = buildLatexFigure(fileName, labelBase);

    await editor.edit((editBuilder) => {
        editBuilder.insert(editor.selection.active, latex);
    });

    // Ensure \graphicspath is updated in the main document
    const mainDoc = await findMainTexDocument(editor.document);
    await ensureGraphicspath(mainDoc);

    vscode.window.showInformationMessage(
        `LaTeXiS: Imagen pegada en ${path.basename(imageDir.fsPath)}/${fileName}.`
    );
}
