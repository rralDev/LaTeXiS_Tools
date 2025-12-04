# LaTeXiS — Intelligent LaTeX Assistant for Spanish-speaking Researchers

LaTeXiS is a VS Code extension designed to make LaTeX easier, faster, and more intuitive—especially for **Spanish-speaking students, researchers, and thesis writers**.  
Its mission is simple: **reduce the learning curve of LaTeX** by providing smart snippets, automatic package management, APA citation tools, and project‑aware assistance.

Whether you are writing your **thesis**, a **scientific article**, or an **academic report**, LaTeXiS helps you focus on content while it takes care of structure, formatting, and boilerplate.

---

## ✨ Key Features

### 🔹 1. Intelligent Snippets (in Spanish)
LaTeXiS provides context‑aware LaTeX snippets written **in Spanish**, making the environment more natural for new users.

Examples:
- `Insertar figura` → Inserts a complete `figure` environment, `wrapfigure`, or `\includegraphics`.
- `Insertar ecuación` → Inserts equation, align, align*, split, and more.

All snippets automatically:
- Detect the project’s **main .tex file**
- Insert required **packages** in the correct place
- Avoid polluting chapter files with preamble content

---

### 🔹 2. Automatic Package Detection (Project‑Wide)
LaTeXiS scans the entire project to determine what packages your document really needs.

It detects packages for:
- **Figures** (graphicx, wrapfig)
- **Tables** (booktabs, longtable, tabularx, array, xcolor, colortbl)
- **Mathematics** (amsmath, amssymb, mathtools)
- **References** (biblatex, hyperref, cleveref, natbib)
- **Text tools** (csquotes, etc.)

Then it:
- Inserts ONLY the missing packages
- Prevents duplicates
- Writes them **below the `\documentclass` section of the main file**

This ensures a **clean, consistent preamble** across multi‑file projects.

---

### 🔹 3. APA Citation System (Fully Automated)
LaTeXiS includes a fully automated **APA (7th edition)** setup using `biblatex` and `biber`.

When you run:
> **LaTeXiS: Insertar configuración APA**

The extension:
1. Inserts the complete APA configuration block  
2. Detects conflicts with existing `biblatex` or `natbib` settings  
3. Searches for existing `.bib` files in the project  
4. Lets you choose one OR auto‑creates `bibliografia.bib`  
5. Inserts:
   - `\usepackage[backend=biber,style=apa]{biblatex}`
   - `\DeclareLanguageMapping{spanish}{spanish-apa}`
   - `\usepackage{csquotes}`
   - `\addbibresource{...}`  
6. Automatically inserts `\printbibliography` before `\end{document}`  
7. Ensures all changes occur **only in the main .tex file**

This makes bibliographies extremely easy for beginners.

---

### 🔹 4. Multi‑File Project Intelligence
LaTeXiS understands entire LaTeX projects—not just single files.

It automatically:
- Finds the **main .tex file** (the one containing `\documentclass`)
- Scans all `.tex` files in the workspace
- Aggregates package requirements across chapters
- Ensures all preamble modifications occur ONLY in the main file

Ideal for theses where content is split across many chapters.

---

### 🔹 5. Spanish‑First Design (with Future Multilingual Support)
LaTeXiS is built for **native Spanish-speaking LaTeX users**, offering:

- Snippets written in Spanish  
- Commands with Spanish names  
- Documentation aligned to Latin‑American and Spanish academic standards  

A future roadmap includes support for:
- Portuguese  
- French  
- German  
- English  

With a system that allows per‑language snippet sets.

---

## 📸 Screenshots (Recommended to Add Later)
You may want to include:
- Snippet insertion examples  
- APA configuration in action  
- Package auto‑detection demonstration  
- Multi‑file analysis panels  

Place images inside the `/images` folder and reference them here.

---

## 🚀 Commands Overview

| Command | Description |
|--------|-------------|
| **LaTeXiS: Insertar figura** | Inserts figure environments and adds required packages. |
| **LaTeXiS: Insertar ecuación** | Inserts equations, align, align\*, split, or display math. |
| **LaTeXiS: Analizar documento y añadir paquetes faltantes** | Scans the entire project and inserts only missing packages. |
| **LaTeXiS: Insertar configuración APA** | Sets up APA, manages .bib files, and inserts bibliography printing. |
| **Hello World** | Default test command (will be removed in future). |

---

## ⚙️ Requirements

- **VS Code 1.76+**  
- A working LaTeX distribution (TeX Live, MiKTeX, or MacTeX)  
- For APA: **biber** must be installed  

Optional:
- Better BibTeX for Zotero (future integration planned)

---

## 🔧 Extension Settings

LaTeXiS contributes:

### `latexis.mainFile`
Overrides autodetection of the main TeX document.

Example:
```json
"latexis.mainFile": "tesis.tex"
```

More settings will be added as the extension matures.

---

## 🧩 Known Issues

- Integration with Zotero is not yet available (planned for future version).  
- Snippets APA for citations (`\textcite`, `\parencite`, etc.) will be added soon.  
- No multilingual snippet sets yet (Spanish-only release).  

---

## 📈 Roadmap

### ✔ Current (0.1.x)
- Smart snippets  
- Automatic package insertion  
- APA automatic configuration  
- Multi-file project analysis  
- Creation of `.bib` file  

### 🔜 Upcoming
- Zotero auto‑export integration  
- APA citation snippets  
- Template generator for theses  
- Language-specific snippet packs  
- Marketplace publishing  

### 🎯 Future
- AI-based LaTeX code suggestions  
- Document structuring assistant  
- Template marketplace for universities  

---

## 👤 Author & Credits

Developed by **Luis Robles**  
Email: *albert.physik@gmail.com*  

Created for students and researchers who want a **smoother transition into LaTeX**, particularly in the **Spanish-speaking academic community**.

---

## 📜 License

MIT License (or your preferred license).

---

**Enjoy LaTeX with LaTeXiS!**  
Empowering Spanish-speaking researchers, one document at a time.
