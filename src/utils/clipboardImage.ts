import * as vscode from "vscode";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import { execFile } from "child_process";

function execFileAsync(cmd: string, args: string[]): Promise<{ stdout: Buffer; stderr: Buffer }> {
    return new Promise((resolve, reject) => {
        execFile(cmd, args, { encoding: "buffer", maxBuffer: 50 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) return reject(err);
            resolve({ stdout: stdout as Buffer, stderr: (stderr ?? Buffer.alloc(0)) as Buffer });
        });
    });
}

/**
 * Lee una imagen del portapapeles y devuelve bytes PNG.
 * - macOS: requiere `pngpaste` (brew install pngpaste)
 * - Linux: requiere `xclip`
 * - Windows: PowerShell + .NET
 */
export async function readClipboardPng(): Promise<Buffer> {
    const platform = process.platform;

    if (platform === "darwin") {
        try {
            const { stdout } = await execFileAsync("pngpaste", ["-"]);
            if (!stdout || stdout.length === 0) throw new Error("Clipboard vacío o sin imagen.");
            return stdout;
        } catch (e) {
            void vscode.window.showErrorMessage(
                "LaTeXiS: En macOS necesitas `pngpaste` para leer imágenes del portapapeles. Ej: `brew install pngpaste`."
            );
            throw e;
        }
    }

    if (platform === "linux") {
        try {
            const { stdout } = await execFileAsync("xclip", ["-selection", "clipboard", "-t", "image/png", "-o"]);
            if (!stdout || stdout.length === 0) throw new Error("Clipboard vacío o sin imagen PNG.");
            return stdout;
        } catch (e) {
            void vscode.window.showErrorMessage(
                "LaTeXiS: En Linux necesitas `xclip` para leer imágenes del portapapeles."
            );
            throw e;
        }
    }

    if (platform === "win32") {
        const tmpFile = path.join(os.tmpdir(), `latexis_clip_${Date.now()}.png`);
        const ps = [
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            [
                "Add-Type -AssemblyName System.Windows.Forms;",
                "Add-Type -AssemblyName System.Drawing;",
                "$img=[System.Windows.Forms.Clipboard]::GetImage();",
                "if ($img -eq $null) { exit 1 }",
                `$img.Save('${tmpFile.replace(/\\/g, "\\\\")}', [System.Drawing.Imaging.ImageFormat]::Png);`
            ].join(" ")
        ];

        try {
            await execFileAsync("powershell", ps);
            const bytes = await fs.promises.readFile(tmpFile);
            await fs.promises.unlink(tmpFile).catch(() => undefined);
            if (!bytes || bytes.length === 0) throw new Error("Salida vacía.");
            return bytes;
        } catch (e) {
            await fs.promises.unlink(tmpFile).catch(() => undefined);
            void vscode.window.showErrorMessage("LaTeXiS: No se encontró una imagen en el portapapeles (Windows).");
            throw e;
        }
    }

    throw new Error(`Unsupported platform: ${platform}`);
}