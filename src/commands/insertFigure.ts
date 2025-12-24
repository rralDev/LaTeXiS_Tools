import * as vscode from "vscode";
import { ensurePackage } from "../utils/packages";
import { ensureGraphicspath } from "../utils/graphicsPath";
import { findMainTexDocument } from "../extension";

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

async function findAnyImageDirectory(root: vscode.Uri): Promise<vscode.Uri | null> {
  // IMPORTANT: exclude build/output folders (case-insensitive)
  const EXCLUDED_DIRS = new Set([
    ".git",
    ".vscode",
    "node_modules",
    "dist",
    "out",
    "build",
    "target",
    "bin",
    ".cache"
  ]);

  const isExcluded = (name: string): boolean => {
    return EXCLUDED_DIRS.has(name.toLowerCase());
  };

  try {
    const entries = await vscode.workspace.fs.readDirectory(root);
    for (const [name, type] of entries) {
      if (type !== vscode.FileType.Directory) {
        continue;
      }
      if (isExcluded(name)) {
        continue;
      }

      const dir = vscode.Uri.joinPath(root, name);
      try {
        const files = await vscode.workspace.fs.readDirectory(dir);
        const hasImages = files.some(([f]) => /\.(png|jpg|jpeg|pdf|eps)$/i.test(f));
        if (hasImages) {
          return dir;
        }
      } catch {
        continue;
      }
    }
  } catch {
    return null;
  }

  return null;
}

async function ensureImageFolder(baseUri?: vscode.Uri): Promise<vscode.Uri | null> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  let root: vscode.Uri | null = null;

  if (workspaceFolders && workspaceFolders.length > 0) {
    root = workspaceFolders[0].uri;
  } else if (baseUri) {
    root = baseUri.with({ path: baseUri.path.replace(/[^/]+$/, "") });
  } else {
    vscode.window.showWarningMessage(
      "LaTeXiS: No se encontró carpeta de proyecto."
    );
    return null;
  }

  const candidateFolders = ["img", "imgs", "imagenes", "figures"];
  for (const folder of candidateFolders) {
    const folderUri = vscode.Uri.joinPath(root, folder);
    try {
      await vscode.workspace.fs.stat(folderUri);
      const files = await vscode.workspace.fs.readDirectory(folderUri);
      const hasImages = files.some(([name]) =>
        /\.(png|jpg|jpeg|pdf|eps)$/i.test(name)
      );
      if (hasImages) {
        return folderUri;
      }
    } catch {
      // continue
    }
  }

  return null;
}

function parseGraphicspathDirs(mainText: string, mainDir: vscode.Uri): vscode.Uri[] {
  // Matches: \graphicspath{{img/}{Resultados/}}
  const gpMatch = mainText.match(/\\graphicspath\s*\{((?:\{[^{}]*\})+)\s*\}/m);
  if (!gpMatch) {
    return [];
  }

  const entries = gpMatch[1].match(/\{([^}]+)\}/g) || [];
  const dirs: vscode.Uri[] = [];

  for (const e of entries) {
    const raw = e.slice(1, -1).replace(/\/+$/, "");
    if (!raw) {
      continue;
    }
    dirs.push(vscode.Uri.joinPath(mainDir, raw));
  }

  return dirs;
}

async function pickFirstImageFromDirs(dirs: vscode.Uri[]): Promise<string | null> {
  const isImage = (name: string) => /\.(png|jpg|jpeg|pdf|eps)$/i.test(name);

  for (const dir of dirs) {
    try {
      const files = await vscode.workspace.fs.readDirectory(dir);
      const imgs = files
        .map(([n]) => n)
        .filter(isImage)
        .sort((a, b) => a.localeCompare(b));

      if (imgs.length > 0) {
        return imgs[0].replace(/\.[^/.]+$/, "");
      }
    } catch {
      // ignore unreadable dirs
    }
  }

  return null;
}

/* --------------------------------------------------
 * Command registration
 * -------------------------------------------------- */

export function registerInsertFigure(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.insertFigure",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No hay un editor activo.");
        return;
      }

      const mainDoc = await findMainTexDocument(editor.document);
      await ensurePackage(mainDoc, "graphicx");

      let imageDir: vscode.Uri | null = null;

      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        vscode.window.showWarningMessage(
          "LaTeXiS: No se encontró carpeta de proyecto."
        );
        return;
      }

      const root = workspaceFolders[0].uri;

      // 1️⃣ Try any existing image directory (recursive, safe)
      imageDir = await findAnyImageDirectory(root);

      // 2️⃣ If none exists, create img/ and seed with logo
      if (!imageDir) {
        imageDir = vscode.Uri.joinPath(root, "img");
        await vscode.workspace.fs.createDirectory(imageDir);

        try {
          const extension = vscode.extensions.getExtension("LuisRobles.latexis");
          if (extension) {
            const source = vscode.Uri.joinPath(
              extension.extensionUri,
              "resources",
              "logo_latexis.png"
            );
            const dest = vscode.Uri.joinPath(imageDir, "logo_latexis.png");
            const data = await vscode.workspace.fs.readFile(source);
            await vscode.workspace.fs.writeFile(dest, data);
          }
        } catch {
          // ignore
        }
      }

      await ensureGraphicspath(mainDoc);

      // Pick default image from the directories that are actually in \graphicspath
      const mainDir = mainDoc.uri.with({
        path: mainDoc.uri.path.replace(/[^/]+$/, "")
      });

      const refreshedMainText = mainDoc.getText();
      const gpDirs = parseGraphicspathDirs(refreshedMainText, mainDir);

      // Fallback: if \graphicspath is missing/empty, use the detected/created imageDir
      const dirsToSearch = gpDirs.length > 0 ? gpDirs : [imageDir];

      const pickedDefault = await pickFirstImageFromDirs(dirsToSearch);
      const defaultImageName = pickedDefault ?? "logo_latexis";

      const options = [
        "📷 Figura estándar",
        "🧩 Figura compuesta (subfiguras)",
        "↔️ Figura a ancho completo",
        "📰 Imagen con texto alrededor",
        "📐 Figura con caption lateral",
        "📎 Solo imagen"
      ];

      const choice = await vscode.window.showQuickPick(options, {
        placeHolder: "Selecciona el tipo de figura"
      });

      if (!choice) {return;}

      let snippet: vscode.SnippetString;

      /* --------------------------------------------------
       * Figura estándar
       * -------------------------------------------------- */
      if (choice === options[0]) {
        await ensurePackage(mainDoc, "float");

        snippet = new vscode.SnippetString(
          "\\begin{figure}[H]\n" +
          "  \\\\centering\n" +
          "  \\\\includegraphics[width=0.8\\\\textwidth]{" + defaultImageName + "}\n" +
          "  \\\\caption{${1:Descripción de la figura}}\n" +
          "  \\\\label{fig:${2:etiqueta}}\n" +
          "\\end{figure}\n"
        );
      }

      /* --------------------------------------------------
       * Subfiguras
       * -------------------------------------------------- */
      else if (choice === options[1]) {
        await ensurePackage(mainDoc, "subcaption");
        await ensurePackage(mainDoc, "float");

        snippet = new vscode.SnippetString(
          "\\begin{figure}[H]\n" +
          "  \\\\centering\n" +
          "  \\\\begin{subfigure}{0.45\\\\textwidth}\n" +
          "    \\\\centering\n" +
          "    \\\\includegraphics{" + defaultImageName + "}\n" +
          "    \\\\caption{Primera descripción}\n" +
          "  \\\\end{subfigure}\n" +
          "  \\\\begin{subfigure}{0.45\\\\textwidth}\n" +
          "    \\\\centering\n" +
          "    \\\\includegraphics{" + defaultImageName + "}\n" +
          "    \\\\caption{Segunda descripción}\n" +
          "  \\\\end{subfigure}\n" +
          "  \\\\caption{${1:Descripción general}}\n" +
          "  \\\\label{fig:${2:etiqueta}}\n" +
          "\\end{figure}\n"
        );
      }

      /* --------------------------------------------------
       * Ancho completo
       * -------------------------------------------------- */
      else if (choice === options[2]) {
        snippet = new vscode.SnippetString(
          "\\begin{figure*}[t]\n" +
          "  \\\\centering\n" +
          "  \\\\includegraphics[width=\\\\textwidth]{" + defaultImageName + "}\n" +
          "  \\\\caption{${1:Descripción de la figura}}\n" +
          "  \\\\label{fig:${2:etiqueta}}\n" +
          "\\end{figure*}\n"
        );
      }

      /* --------------------------------------------------
       * Wrapfigure
       * -------------------------------------------------- */
      else if (choice === options[3]) {
        await ensurePackage(mainDoc, "wrapfig");

        const side = await vscode.window.showQuickPick(
          ["Texto a la derecha", "Texto a la izquierda"],
          { placeHolder: "¿Dónde debe ir el texto?" }
        );
        if (!side) {return;}

        const pos = side.includes("derecha") ? "r" : "l";

        snippet = new vscode.SnippetString(
          "\\begin{wrapfigure}{" + pos + "}{0.4\\\\textwidth}\n" +
          "  \\\\centering\n" +
          "  \\\\includegraphics[width=0.38\\\\textwidth]{" + defaultImageName + "}\n" +
          "  \\\\caption{${1:Descripción}}\n" +
          "\\end{wrapfigure}\n"
        );
      }

      /* --------------------------------------------------
       * SCfigure
       * -------------------------------------------------- */
      else if (choice === options[4]) {
        await ensurePackage(mainDoc, "sidecap");

        snippet = new vscode.SnippetString(
          "\\begin{SCfigure}[0.5][htbp]\n" +
          "  \\\\centering\n" +
          "  \\\\includegraphics[width=0.45\\\\textwidth]{" + defaultImageName + "}\n" +
          "  \\\\caption{${1:Descripción de la figura}}\n" +
          "  \\\\label{fig:${2:etiqueta}}\n" +
          "\\end{SCfigure}\n"
        );
      }

      /* --------------------------------------------------
       * Inline
       * -------------------------------------------------- */
      else {
        snippet = new vscode.SnippetString(
          "\\\\includegraphics[width=0.5\\\\textwidth]{" +
          defaultImageName +
          "}\n"
        );
      }

      editor.insertSnippet(snippet);
    }
  );

  context.subscriptions.push(cmd);
}