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
      // 2. Find config.tex and insert biblatex packages
      // -------------------------------
      const configTexPath = path.join(root, "config.tex");
      if (!fs.existsSync(configTexPath)) {
        vscode.window.showErrorMessage(
          "LaTeXiS: No se encontró config.tex en la raíz del proyecto."
        );
        return;
      }

      let configTex = fs.readFileSync(configTexPath, "utf8");

      const biblatexPackages = `% ============================
% Bibliografía — LaTeXiS
% ============================
\\usepackage[backend=biber,style=apa]{biblatex}
\\usepackage{csquotes}

\\addbibresource{bibliography/articulos.bib}
\\addbibresource{bibliography/libros.bib}
\\addbibresource{bibliography/tesis.bib}
\\addbibresource{bibliography/reportes.bib}
\\addbibresource{bibliography/online.bib}
\\addbibresource{bibliography/otros.bib}
`;

      const hasBiblatex = configTex.includes("\\usepackage[backend=biber,style=apa]{biblatex}");

      if (!hasBiblatex) {
        // Try to insert two lines BEFORE "% metadata section"
        const metadataLines = configTex.split("\n");
        let metaLineIndex = metadataLines.findIndex(l =>
          l.trim().toLowerCase() === "% metadata section"
        );

        if (metaLineIndex !== -1) {
          // Insert bibliography block two lines before metadata section
          const insertAt = Math.max(0, metaLineIndex - 2);
          metadataLines.splice(insertAt, 0, biblatexPackages.trim(), "");
          configTex = metadataLines.join("\n");
        } else {
          // Fallback: insert after "% packages section" as before
          const marker = "% packages section";
          const insertIndex = configTex.indexOf(marker);
          if (insertIndex !== -1) {
            // Insert after the marker line
            const markerLineEnd = configTex.indexOf("\n", insertIndex);
            if (markerLineEnd !== -1) {
              configTex =
                configTex.slice(0, markerLineEnd + 1) +
                biblatexPackages +
                configTex.slice(markerLineEnd + 1);
            } else {
              // marker is last line
              configTex += "\n" + biblatexPackages;
            }
          }
        }
        fs.writeFileSync(configTexPath, configTex, "utf8");
      }

      // -------------------------------
      // 3. Find main .tex
      // -------------------------------
      const texFiles = fs
        .readdirSync(root)
        .filter(f => f.endsWith(".tex") && f !== "config.tex");

      if (texFiles.length === 0) {
        return;
      }

      const mainTex = path.join(root, texFiles[0]);
      let tex = fs.readFileSync(mainTex, "utf8");

      // -------------------------------
      // 4. printbibliography (ÚNICO lugar)
      // -------------------------------
      const hasPrintBibliography = tex.includes("\\printbibliography");

      if (!hasPrintBibliography) {
        if (/\\end\{document\}/.test(tex)) {
          tex = tex.replace(
            /\\end\{document\}/,
            `
% ============================
% Ejemplo de cita: \\autocite{lamport1994}
% Bibliografía — LaTeXiS
% ============================
\\printbibliography

\\end{document}`
          );
        }
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