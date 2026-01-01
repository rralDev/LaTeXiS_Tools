import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

/**
 * Initial Setup — LaTeXiS
 * Configura BibLaTeX + estructura base.
 * ESTE es el ÚNICO comando que inserta \\printbibliography.
 */
export function registerInitialSetup(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.initialSetup",
    async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders || folders.length === 0) {
        vscode.window.showErrorMessage("LaTeXiS: Abre una carpeta primero.");
        return;
      }

      const root = folders[0].uri.fsPath;

      // -------------------------------
      // 1. Bibliography directory
      // -------------------------------
      const bibDir = path.join(root, "bibliography");
      if (!fs.existsSync(bibDir)) fs.mkdirSync(bibDir);

      const bibFiles = [
        "articulos.bib",
        "libros.bib",
        "tesis.bib",
        "reportes.bib",
        "online.bib",
        "otros.bib"
      ];

      for (const f of bibFiles) {
        const p = path.join(bibDir, f);
        if (fs.existsSync(p)) continue;

        if (f === "libros.bib") {
          fs.writeFileSync(
            p,
            `% Bibliografía — LaTeXiS
% Ejemplo inicial

@book{lamport1994,
  author    = {Lamport, Leslie},
  title     = {LaTeX: A Document Preparation System},
  year      = {1994},
  edition   = {2},
  publisher = {Addison-Wesley}
}

`,
            "utf8"
          );
        } else {
          fs.writeFileSync(
            p,
            `% Bibliografía — LaTeXiS
% Archivo generado automáticamente
% Categoría: ${f.replace(".bib", "")}

`,
            "utf8"
          );
        }
      }

      // -------------------------------
      // 2. Find main .tex
      // -------------------------------
      const texFiles = fs.readdirSync(root).filter(f => f.endsWith(".tex"));
      if (texFiles.length === 0) return;

      const mainTex = path.join(root, texFiles[0]);
      let tex = fs.readFileSync(mainTex, "utf8");

      // -------------------------------
      // 3. BibLaTeX preamble
      // -------------------------------
      if (!tex.includes("biblatex")) {
        tex = tex.replace(
          /\\documentclass[^\n]*\n/,
          m =>
            m +
            "\\usepackage[backend=biber,style=apa]{biblatex}\n" +
            "\\usepackage{csquotes}\n\n"
        );
      }

      if (!tex.includes("% Bibliografía (LaTeXiS)")) {
        tex = tex.replace(
          /\\usepackage[^\n]*biblatex[^\n]*\n/,
          m =>
            m +
            `% ==========================================
% Bibliografía (LaTeXiS)
% ==========================================
\\addbibresource{bibliography/articulos.bib}
\\addbibresource{bibliography/libros.bib}
\\addbibresource{bibliography/tesis.bib}
\\addbibresource{bibliography/reportes.bib}
\\addbibresource{bibliography/online.bib}
\\addbibresource{bibliography/otros.bib}
% ==========================================
`
        );
      }

      // -------------------------------
      // 4. printbibliography (ÚNICO lugar)
      // -------------------------------
      if (!tex.includes("\\printbibliography")) {
        tex = tex.replace(
          /\\end\{document\}/,
          `
% ============================
% Ejemplo de cita \\autocite{lamport1994}
\\clearpage
% Bibliografía (LaTeXiS)
% ============================
\\printbibliography
% ============================

\\end{document}`
        );
      }

      fs.writeFileSync(mainTex, tex, "utf8");

      // -------------------------------
      // 5. VS Code LaTeX Workshop config
      // -------------------------------
      const vscodeDir = path.join(root, ".vscode");
      const settingsPath = path.join(vscodeDir, "settings.json");

      if (!fs.existsSync(vscodeDir)) {
        fs.mkdirSync(vscodeDir);
      }

      let settings: any = {};
      if (fs.existsSync(settingsPath)) {
        try {
          settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
        } catch {
          settings = {};
        }
      }

      // Ensure tools
      settings["latex-workshop.latex.tools"] =
        settings["latex-workshop.latex.tools"] ?? [];

      const tools = settings["latex-workshop.latex.tools"];

      const ensureTool = (tool: any) => {
        if (!tools.some((t: any) => t.name === tool.name)) {
          tools.push(tool);
        }
      };

      ensureTool({
        name: "pdflatex",
        command: "pdflatex",
        args: [
          "-synctex=1",
          "-interaction=nonstopmode",
          "-file-line-error",
          "-output-directory=Build",
          "%DOC%"
        ]
      });

      ensureTool({
        name: "biber",
        command: "biber",
        args: [
          "--input-directory=Build",
          "%DOCFILE%"
        ]
      });

      // Ensure recipe
      settings["latex-workshop.latex.recipes"] =
        settings["latex-workshop.latex.recipes"] ?? [];

      if (
        !settings["latex-workshop.latex.recipes"].some(
          (r: any) => r.name === "pdflatex → biber → pdflatex ×2"
        )
      ) {
        settings["latex-workshop.latex.recipes"].push({
          name: "pdflatex → biber → pdflatex ×2",
          tools: ["pdflatex", "biber", "pdflatex", "pdflatex"]
        });
      }

      fs.writeFileSync(
        settingsPath,
        JSON.stringify(settings, null, 2),
        "utf8"
      );

      vscode.window.showInformationMessage(
        "LaTeXiS: Configuración inicial aplicada correctamente."
      );
    }
  );

  context.subscriptions.push(cmd);
}