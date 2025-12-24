import * as vscode from "vscode";
import { findMainTexDocument } from "../extension";

export function registerChangeCitationStyle(context: vscode.ExtensionContext): void {
    const command = vscode.commands.registerCommand(
        "latexis.changeCitationStyle",
        async () => {

            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage("No hay un editor activo.");
                return;
            }

            const mainDocument = await findMainTexDocument(editor.document);
            const mainText = mainDocument.getText();

            if (!mainText.includes("\\documentclass")) {
                vscode.window.showWarningMessage(
                    "No se encontró \\documentclass en el archivo principal."
                );
                return;
            }

            const styleOptions: { label: string; value: string }[] = [
                { label: "APA (autor–año)", value: "apa" },
                { label: "IEEE (numérico)", value: "ieee" },
                { label: "Autor–Año (genérico)", value: "authoryear" },
                { label: "Numérico (genérico)", value: "numeric" },
                { label: "Chicago (autor–año)", value: "chicago-authordate" },
                { label: "Vancouver", value: "vancouver" }
            ];

            const picked = await vscode.window.showQuickPick(
                styleOptions.map(o => o.label),
                { placeHolder: "Selecciona el estilo de citación" }
            );

            if (!picked) {
                return;
            }

            const selected = styleOptions.find(o => o.label === picked);
            if (!selected) {
                return;
            }

            const style = selected.value;

            const biblatexWithOptsRegex = /\\usepackage\s*\[([^\]]*)\]\s*\{biblatex\}/;
            const biblatexNoOptsRegex = /\\usepackage\s*\\{biblatex\\}/;

            let newText = mainText;

            if (biblatexWithOptsRegex.test(mainText)) {
                newText = mainText.replace(
                    biblatexWithOptsRegex,
                    (_match, options: string) => {
                        const parts = options
                            .split(",")
                            .map(p => p.trim())
                            .filter(Boolean)
                            .filter(p => !p.startsWith("style="));

                        parts.push(`style=${style}`);

                        let rebuilt = `\\usepackage[${parts.join(",")}]{biblatex}`;

                        if (style === "chicago-authordate") {
                            rebuilt += `
% Nota (LaTeXiS):
% El estilo Chicago suele usarse con citas en nota al pie.
% Recomendado:
% \\parencite{}  → (Autor Año)
% \\textcite{}   → Autor (Año)
% \\footcite{}   → Nota al pie completa
`;
                        }

                        return rebuilt;
                    }
                );
            } else if (biblatexNoOptsRegex.test(mainText)) {
                newText = mainText.replace(
                    biblatexNoOptsRegex,
                    `\\usepackage[backend=biber,style=${style}]{biblatex}`
                );
            } else {
                const lines = mainText.split("\n");
                let insertLine = 0;

                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].includes("\\documentclass")) {
                        insertLine = i + 1;
                        break;
                    }
                }

                const biblatexBlock =
`% ============================
%   Bibliografía (LaTeXiS)
% ============================
\\usepackage[backend=biber,style=${style}]{biblatex}

`;

                lines.splice(insertLine, 0, biblatexBlock);
                newText = lines.join("\n");
            }

            const edit = new vscode.WorkspaceEdit();
            edit.replace(
                mainDocument.uri,
                new vscode.Range(0, 0, mainDocument.lineCount, 0),
                newText
            );

            await vscode.workspace.applyEdit(edit);

            vscode.window.showInformationMessage(
                `Estilo de citación actualizado a: ${picked}`
            );
        }
    );

    context.subscriptions.push(command);
}