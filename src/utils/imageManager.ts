import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";

export type ImageSaveResult = {
    absPath: string;
    relPathForLatex: string;
    fileName: string;
};

function sanitizeBaseName(name: string): string {
    const trimmed = (name || "").trim();
    const safe = trimmed.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_\-]/g, "");
    return safe.length ? safe : "img";
}

function ensureForwardSlashes(p: string): string {
    return p.replace(/\\/g, "/");
}

async function pathExists(p: string): Promise<boolean> {
    try {
        await fs.promises.access(p);
        return true;
    } catch {
        return false;
    }
}

export async function ensureImagesDir(): Promise<string> {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) throw new Error("No workspace folder open.");

    const root = folders[0].uri.fsPath;
    const imgDir = path.join(root, "img");
    await fs.promises.mkdir(imgDir, { recursive: true });
    return imgDir;
}

export async function getUniqueClipboardImageName(baseNameInput?: string): Promise<string> {
    const imgDir = await ensureImagesDir();

    const base = sanitizeBaseName(baseNameInput || "");
    const baseWithPP =
        base === "img" && !baseNameInput?.trim()
            ? "img_PP"
            : `${base}_PP`;

    let candidate = `${baseWithPP}.png`;
    let i = 2;
    while (await pathExists(path.join(imgDir, candidate))) {
        candidate = `${baseWithPP}_${i}.png`;
        i++;
    }
    return candidate;
}

export async function savePngToImagesDir(pngBytes: Buffer, fileName: string): Promise<ImageSaveResult> {
    const imgDir = await ensureImagesDir();
    const absPath = path.join(imgDir, fileName);
    await fs.promises.writeFile(absPath, pngBytes);

    const relPathForLatex = ensureForwardSlashes(path.posix.join("img", fileName));
    return { absPath, relPathForLatex, fileName };
}