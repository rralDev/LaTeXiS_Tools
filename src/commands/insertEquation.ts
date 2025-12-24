import * as vscode from "vscode";
import { ensurePackage } from "../utils/packages";
import { findMainTexDocument } from "../extension";

export function registerInsertEquation(context: vscode.ExtensionContext) {
  const cmd = vscode.commands.registerCommand(
    "latexis.insertEquation",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showErrorMessage("No hay un editor activo.");
        return;
      }

      const mainDoc = await findMainTexDocument(editor.document);

      const latexNL = (times: number = 1): string =>
        Array(times).fill("\\\\\\\\").join("\n");

      const categorias = [
        "📌 Ecuación simple",
        "📐 Ecuaciones alineadas",
        "🧮 Sistemas y matrices",
        "📊 Multilínea",
        "⚛️ Física (ejemplos)"
      ];

      const categoria = await vscode.window.showQuickPick(categorias, {
        placeHolder: "Selecciona la categoría de ecuación"
      });

      if (!categoria) {return;}

      let snippet: vscode.SnippetString | null = null;

      // --------------------------------------------------
      // 📌 Ecuación simple
      // --------------------------------------------------
      if (categoria === categorias[0]) {
        const opciones = [
          "Numerada (equation)",
          "Sin numerar (\\[ \\])"
        ];

        const picked = await vscode.window.showQuickPick(opciones);
        if (!picked) {return;}

        if (picked === opciones[0]) {
          snippet = new vscode.SnippetString(
            "\\begin{equation}\n" +
            "  ${1:E = mc^2}\n" +
            "  \\label{eq:${2:etiqueta}}\n" +
            "\\end{equation}\n"
          );
        } else {
          snippet = new vscode.SnippetString(
            "\\[\n" +
            "  ${1:E = mc^2}\n" +
            "\\]\n"
          );
        }
      }

      // --------------------------------------------------
      // 📐 Alineadas
      // --------------------------------------------------
      else if (categoria === categorias[1]) {
        await ensurePackage(mainDoc, "amsmath");

        const opciones = ["align", "align*"];
        const picked = await vscode.window.showQuickPick(opciones);
        if (!picked) {return;}

        if (picked === opciones[0]) {
          snippet = new vscode.SnippetString(
            "\\begin{align}\n" +
            "  a &= b + c " + latexNL() + "\n" +
            "  d &= e - f\n" +
            "\\end{align}\n"
          );
        } else {
          snippet = new vscode.SnippetString(
            "\\begin{align*}\n" +
            "  x &= y + z " + latexNL() + "\n" +
            "  y &= z - x\n" +
            "\\end{align*}\n"
          );
        }
      }

      // --------------------------------------------------
      // 🧮 Sistemas / matrices
      // --------------------------------------------------
      else if (categoria === categorias[2]) {
        await ensurePackage(mainDoc, "amsmath");

        const opciones = ["Sistema (cases)", "Matriz (pmatrix)"];
        const picked = await vscode.window.showQuickPick(opciones);
        if (!picked) {return;}

        if (picked === opciones[0]) {
          snippet = new vscode.SnippetString(
            "\\begin{equation}\n" +
            "  \\begin{cases}\n" +
            "    x + y = 1 " + latexNL() + "\n" +
            "    x - y = 3\n" +
            "  \\end{cases}\n" +
            "  \\label{eq:${1:etiqueta}}\n" +
            "\\end{equation}\n"
          );
        } else {
          snippet = new vscode.SnippetString(
            "\\begin{equation}\n" +
            "  \\begin{pmatrix}\n" +
            "    a & b " + latexNL() + "\n" +
            "    c & d\n" +
            "  \\end{pmatrix}\n" +
            "  \\label{eq:${1:matriz}}\n" +
            "\\end{equation}\n"
          );
        }
      }

      // --------------------------------------------------
      // 📊 Multilínea
      // --------------------------------------------------
      else if (categoria === categorias[3]) {
        await ensurePackage(mainDoc, "amsmath");

        snippet = new vscode.SnippetString(
          "\\begin{multline}\n" +
          "  f(x) = a_0 + a_1 x + a_2 x^2 " + latexNL() + "\n" +
          "  + a_3 x^3 + \\cdots\n" +
          "\\end{multline}\n"
        );
      }

      // --------------------------------------------------
      // --------------------------------------------------
      // ⚛️ Física (ejemplos)
      // --------------------------------------------------
      else if (categoria === categorias[4]) {
        await ensurePackage(mainDoc, "amsmath");

        const opciones = [
          "Segunda ley de Newton",
          "Ecuación de Schrödinger",
          "Ecuación de onda",
          "Ecuaciones de Maxwell (2)"
        ];

        const picked = await vscode.window.showQuickPick(opciones, {
          placeHolder: "Selecciona un ejemplo de física"
        });

        if (!picked) {return;}

        if (picked === opciones[0]) {
          snippet = new vscode.SnippetString(
            "\\begin{equation}\n" +
            "  \\sum \\vec{F} = m \\vec{a}\n" +
            "  \\label{eq:newton}\n" +
            "\\end{equation}\n"
          );
        }

        else if (picked === opciones[1]) {
          snippet = new vscode.SnippetString(
            "\\begin{equation}\n" +
            "  i\\hbar \\frac{\\partial \\Psi}{\\partial t}\n" +
            "  = -\\frac{\\hbar^2}{2m} \\nabla^2 \\Psi + V \\Psi\n" +
            "  \\label{eq:schrodinger}\n" +
            "\\end{equation}\n"
          );
        }

        else if (picked === opciones[2]) {
          snippet = new vscode.SnippetString(
            "\\begin{equation}\n" +
            "  \\nabla^2 u = \\frac{1}{c^2}\n" +
            "  \\frac{\\partial^2 u}{\\partial t^2}\n" +
            "  \\label{eq:onda}\n" +
            "\\end{equation}\n"
          );
        }

        else {
          snippet = new vscode.SnippetString(
            "\\begin{align}\n" +
            "  \\nabla \\cdot \\vec{E} &= \\frac{\\rho}{\\varepsilon_0} " + latexNL() + "\n" +
            "  \\nabla \\times \\vec{E} &= -\\frac{\\partial \\vec{B}}{\\partial t}\n" +
            "\\end{align}\n"
          );
        }
      }

      if (snippet) {
        editor.insertSnippet(snippet);
      }
    }
  );

  context.subscriptions.push(cmd);
}