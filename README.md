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
- Centralized preamble management (all packages are maintained in config.tex).

---

## Quick start (3 steps)

1. **Open your LaTeX project** in VS Code.
2. Use the **Command Palette** (`Ctrl+Shift+P` or `Cmd+Shift+P`) to run LaTeXiS commands.
3. Insert figures, equations, tables, or manage references with simple prompts and automatic formatting.

---

## Package management model

LaTeXiS enforces a **single-source-of-truth preamble model**.

- All LaTeX packages (`\usepackage{...}`) are automatically inserted into **config.tex**.
- `main.tex` remains minimal and structural (documentclass, inputs, document flow).
- This avoids duplicated packages, keeps large projects readable, and simplifies maintenance.

If `config.tex` does not exist, LaTeXiS falls back to inserting packages into `main.tex`.

---

## Main commands

### Gestionar referencias

Insert and manage references easily by DOI or Title. LaTeXiS fetches metadata and updates your bibliography automatically.

Bibliography setup is split intentionally:
- Packages and bibliography resources are configured in `config.tex`.
- `\printbibliography` is inserted into `main.tex` before `\end{document}` when needed.

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

**What LaTeXiS handles automatically:**
- Clean LaTeX table formatting
- Preservation of merged cells and alignment
- Required packages are added to config.tex automatically (never to main.tex).

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
- Required packages are added to config.tex automatically (never to main.tex).

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
- Required packages are added to config.tex automatically (never to main.tex).


## Embedded TODO management

LaTeXiS allows you to manage **TODOs directly inside LaTeX source files**, without external tools or additional workflows.  
TODOs are treated as a natural part of the academic writing process and are fully integrated with the real document structure.

### TODO syntax

```tex
% TODO: Review experimental results
```

- TODOs are detected exclusively inside LaTeX comments.
- They never interfere with compilation.
- Safe for large, multi-file projects.

---

### Primary view: TODOs in the Sidebar (Tree View)

LaTeXiS provides a **persistent sidebar view** that organizes TODOs in a hierarchical and navigable structure:

```
File
 └─ Chapter
     └─ Section / Subsection
         └─ TODO
```

**Features:**
- Grouping by `.tex` file
- Structured by `\chapter`, `\section`, `\subsection`, `\subsubsection`
- Automatic counters per file and section
- Real ordering based on document appearance
- Click a TODO → opens the file and positions the cursor
- Auto-refresh: the view updates automatically on save

**Command:**
```
LaTeXiS: TODOs (Sidebar)
```

**User outcome:**
- Clear overview of pending work
- Immediate navigation between tasks
- Ideal for theses, books, and long academic reports

---

### Markdown report generation (optional)

In addition to the interactive view, LaTeXiS can generate a static report.

**Command:**
```
LaTeXiS: TODOs (Markdown list)
```

**What it does:**
- Scans all `.tex` files in the project
- Fully regenerates `TODOS.md`
- Groups TODOs by file and section

**Example (`TODOS.md`):**
```md
## chapters/introduction.tex

- Line 29: Clearly define the research problem.
- Line 38: List the general and specific objectives of the thesis.

## chapters/methodology.tex

- Line 17: Review experimental setup.
```

---

### Philosophy

- No external dependencies
- No proprietary formats
- TODOs live where knowledge is written
- Designed for real academic writing workflows

**Final result:**  
A lightweight, structural, and fully integrated task system for LaTeX projects.

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

---

## Writing metrics (experimental)

LaTeXiS includes an **experimental writing metrics engine** designed for long academic LaTeX documents.  
Its goal is to provide **real‑time, lightweight, and language‑agnostic feedback** on the structure of academic writing.

The metrics are calculated only on the effective document content (between `\begin{document}` and `\end{document}`), including all files brought in via `\input{}` and `\include{}`.

### Metrics currently supported

#### 1. Word count

A *word* is defined as:

- A contiguous sequence of Unicode letters or digits.
- Numbers with decimal separators (`3.1415`, `125,153.14`) are treated as **a single word**.
- LaTeX commands, comments, math environments, and references are excluded.
- Punctuation marks do not create new words.

This approach avoids over‑counting in scientific texts that contain formulas, constants, or numeric values.

---

#### 2. Paragraph count

A *paragraph* is defined as:

- A block of non‑empty text separated by one or more blank lines.
- Paragraphs must contain at least one valid word.
- Structural commands such as `\chapter`, `\section`, etc. do **not** count as paragraphs by themselves.

This definition matches the way paragraphs are understood in academic writing rather than visual formatting.

---

#### 3. Sentence count

Sentence detection is the most complex metric and uses a **heuristic, entropy‑inspired segmentation algorithm**.

A sentence boundary is detected based on **contextual information**, not on fixed dictionaries or hard‑coded abbreviations.

The algorithm considers:

- Terminal punctuation (`.`, `?`, `!`) as *candidates*, not guarantees.
- The number of spaces or line breaks after punctuation.
- The length and structure of the token before the punctuation.
- The type of character following the punctuation (uppercase letter, lowercase letter, LaTeX command).
- Local predictability of the surrounding characters (inspired by Shannon entropy).

This allows LaTeXiS to correctly handle:

- Abbreviations such as `Dr.`, `Dra.`, `etc.` without relying on language‑specific lists.
- Decimal numbers (`3.1415`, `125,153.14`) without splitting sentences.
- Scientific writing patterns common in LaTeX documents.
- Sentences followed by LaTeX commands (e.g. citations).

The design goal is **robustness and scalability** across languages, rather than perfect linguistic parsing.

---

### Design principles

- No external NLP libraries.
- No large language models.
- No language‑specific dictionaries.
- Linear‑time processing suitable for real‑time updates in VS Code.

These metrics are intended to support **self‑review and structural awareness**, not to replace formal linguistic analysis tools.

Future versions may expose additional metrics and configuration options.

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
