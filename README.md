# LaTeXiS — Intelligent LaTeX Assistant for Spanish‑speaking Researchers (VS Code)

LaTeXiS is a VS Code extension designed to simplify LaTeX writing for **Spanish-speaking students, researchers, and thesis writers**. It streamlines inserting figures, equations, tables, and managing references with easy-to-use commands.

## Project scope and philosophy (v0.2)

LaTeXiS is not a snippet collection.  
It is a **productivity-oriented academic LaTeX toolkit** designed to support **real research workflows**: long theses, multi-file projects, frequent revisions, and iterative writing.

Core principles:

- Minimal commands, maximum impact.
- One command per domain (references, tables, figures, TODOs, compilation, scaffolding).
- Automation over configuration.
- Safe operations (idempotent, no silent overwrites).
- Clear feedback to the user (warnings > hard errors).

Version **v0.2** focuses on **immediate productivity gains**, not experimental features.
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

**Typical workflow:**
1. Run `LaTeXiS: Gestionar referencias`
2. Choose insertion method (DOI or Title)
3. LaTeXiS fetches metadata (OpenAlex / Crossref)
4. Bibliography files are updated
5. `\autocite{}` is inserted at the cursor position

**User result:**
- Clean BibLaTeX entries
- No duplicate references
- Correct citation keys
- Fully automated bibliography setup

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

**User result:**
- Clean LaTeX tables using `booktabs`
- No manual column alignment
- No broken formatting
- Ready-to-compile tables in one step

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

**What LaTeXiS handles automatically:**
- Figure environment creation
- Image path management
- Required package detection
- Figure folder creation if missing

**User result:**
- Zero manual LaTeX boilerplate
- Consistent figure insertion across the project

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

**User result:**
- Correct math environments
- Consistent formatting
- Faster writing of mathematical content


## Embedded TODO management

LaTeXiS supports structured TODO tracking **directly inside LaTeX source files**.

### TODO syntax

```tex
% TODO: Review experimental results
```

### Command

```
LaTeXiS: Listar TODOs
```

### What happens

- All `.tex` files in the workspace are scanned.
- Each TODO is associated with:
  - file name
  - section or chapter
- A `TODOS.md` file is generated from scratch.

### Example output (`TODOS.md`)

```md
## Pending TODOs

- [ ] Review experimental results  
  File: chapters/results.tex  
  Section: Results

- [ ] Rewrite introduction paragraph  
  File: chapters/introduction.tex  
```

**User result:**
- Centralized task overview
- No external task manager required
- Perfect for long theses and reports


## Draft mode / fast compilation

Large academic projects can become slow to compile.

LaTeXiS introduces a **draft compilation mode** focused on the active chapter.

### Command

```
LaTeXiS: Alternar modo borrador (compilación rápida)
```

### How it works

- Detects the currently active chapter file.
- Compiles only that chapter using `\includeonly`.
- Integrates with LaTeX Workshop (no replacement).
- Does not permanently modify the project.

**User result:**
- Much faster compilation
- Faster feedback loop while writing
- Ideal for daily thesis work


## Academic project scaffolding

LaTeXiS can generate a complete academic project structure from scratch.

### Command

```
LaTeXiS: Crear nuevo proyecto académico
```

### Guided workflow

1. Select document type:
   - Article
   - Report
   - Thesis / Book
2. Enter project title.
3. Automatic directory name normalization.
4. Choose creation mode:
   - Empty directory
   - Merge (no overwrite)
   - Automatic subfolder
5. Project structure is generated.
6. Shared assets (figures) are copied.

### Example structure (thesis)

```
my_thesis/
├── main.tex
├── config.tex
├── chapters/
│   ├── introduction.tex
│   ├── methodology.tex
│   └── conclusions.tex
├── figures/
│   └── img_template.png
└── bibliography/
```

**User result:**
- Clean, standardized project layout
- No manual setup
- Ready-to-write LaTeX project in seconds

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


## Current version

**LaTeXiS v0.2**

Focus:
- Immediate productivity
- Large document workflows
- Academic writing support

Future versions will expand into writing analytics, progress tracking, and publication workflows.
