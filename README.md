# LaTeXiS — Intelligent LaTeX Assistant for Spanish‑speaking Researchers (VS Code)

LaTeXiS is a VS Code extension designed to simplify LaTeX writing for **Spanish-speaking students, researchers, and thesis writers**. It streamlines inserting figures, equations, tables, and managing references with easy-to-use commands.

---

## Quick start (3 steps)

1. **Open your LaTeX project** in VS Code.
2. Use the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`) to run LaTeXiS commands.
3. Insert figures, equations, tables, or manage references with simple prompts and automatic formatting.

---

## Main commands

### Gestionar referencias

Insert and manage references easily by DOI or Title. LaTeXiS fetches metadata and updates your bibliography automatically.

**Insert reference by DOI example:**
```
@article{sample2023,
  author = {Author, A.},
  title = {Sample Article},
  journal = {Journal Name},
  year = {2023},
  doi = {10.1234/exampledoi}
}
```

**Insert reference by Title example:**
Search by title keywords; LaTeXiS retrieves matching entries from OpenAlex or Crossref.

---

### Insertar tabla

#### Desde Excel

Import formatted tables from `.xlsx` files, preserving merges and alignment.

![Excel table with merged cells](docs/images/tablaNoSimple.png)

**Example output:**
```tex
\begin{table}[hbtp]
  \centering
  \caption{Descripción de la tabla}
  \label{tab:excel-table}
  \begin{tabular}{ccc}
    \toprule
    Nombre & Apellido & Edad \\
    \midrule
    Jose & Fernandez & 25 \\
    Maria & Martinez & 20 \\
    \bottomrule
  \end{tabular}
\end{table}
```

#### Desde portapapeles

Paste tab-separated data copied from Excel or Sheets directly as a clean LaTeX table.

![Simple Excel table copied to clipboard](docs/images/tablaSimple.png)

**Example output:**
```tex
\begin{table}[H]
  \centering
  \caption{Descripción de la tabla}
  \label{tab:etiquetaTabla}
  \begin{tabular}{llr}
    \toprule
    Nombre & Apellido & Edad \\
    \midrule
    Jose & Fernandez & 25 \\
    Maria & Martinez & 20 \\
    \bottomrule
  \end{tabular}
\end{table}
```

---

### Insertar figura

Insert figures with automatic package management and image path setup. Supports multiple layouts and pasting images from the clipboard.

**Example output (standard figure):**
```tex
\begin{figure}[H]
  \centering
  \includegraphics[width=0.8\textwidth]{mi_imagen}
  \caption{Descripción de la figura}
  \label{fig:etiqueta}
\end{figure}
```

---

### Insertar ecuación

Insert common math environments with correct formatting and line breaks.

**Example output (`align*`):**
```tex
\begin{align*}
  \nabla \cdot \vec{E} &= \frac{\rho}{\varepsilon_0} \\
  \nabla \cdot \vec{B} &= 0
\end{align*}
```

---

## Roadmap

- Enhanced metadata refinement for references
- ISBN and URL imports for citations
- Support for cell colors and typography in Excel tables
- Additional figure templates and customization options
- Modularizing codebase for easier maintenance

---

## Requirements

- VS Code (latest version recommended)
- LaTeX distribution (TeX Live / MiKTeX / MacTeX)
- For references: **biber** backend

Clipboard image pasting may require OS-specific tools:

- macOS: `pngpaste` (`brew install pngpaste`)
- Linux: `xclip` with PNG support
- Windows: No extra tools needed

---

## Author & License

Developed by **Luis Robles**  
Email: [albert.physik@gmail.com](mailto:albert.physik@gmail.com)  

Licensed under MIT License.
