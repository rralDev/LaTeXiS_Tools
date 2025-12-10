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

### 🔹 3. Smart Tables (Clipboard & Excel)
LaTeXiS helps you move tables from spreadsheets into LaTeX with minimal friction:

**Simple tables desde el portapapeles**
- Usa el comando **«LaTeXiS: Pegar tabla simple»**.
- Espera datos copiados desde Excel/Google Sheets como texto tabulado (TSV).
- Inserta un entorno `table` + `tabular` limpio usando `booktabs`.
- Coloca siempre el **caption encima de la tabla**.
- Añade automáticamente el comentario:
  `%% LaTeXiS: Tabla ingresada desde portapapeles`.
- Inserta el paquete `booktabs` en el archivo principal si hace falta.

**Tablas enriquecidas desde Excel (.xlsx)**
- Usa el comando **«LaTeXiS: Insertar tabla desde archivo Excel»**.
- Lee un archivo `.xlsx` con estilos usando `xlsx-js-style`.
- Respeta **celdas combinadas** tanto horizontales como verticales mediante `\multicolumn` y `\multirow`.
- Conserva la **alineación horizontal** básica de cada celda (izquierda, centrado, derecha).
- Inserta automáticamente los paquetes necesarios para tablas complejas:
  `booktabs`, `xcolor`, `colortbl`, `multirow`.
- Escribe un encabezado de comentario:
  ```tex
  % LaTeXiS: Tabla ingresada desde Excel
  % Origen: <ruta-al-archivo.xlsx>
  ```
  donde la ruta es relativa a la carpeta del proyecto cuando es posible.
- Coloca siempre el **caption encima de la tabla**.

_Limitación actual_: el formato tipográfico (negrita, cursiva, colores de texto/fondo) aún **no** se replica desde Excel; por ahora solo se respetan merges y alineación.

---

### 🔹 4. APA Citation System (Fully Automated)
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

### 🔹 5. Multi‑File Project Intelligence
LaTeXiS understands entire LaTeX projects—not just single files.

It automatically:
- Finds the **main .tex file** (the one containing `\documentclass`)
- Scans all `.tex` files in the workspace
- Aggregates package requirements across chapters
- Ensures all preamble modifications occur ONLY in the main file

Ideal for theses where content is split across many chapters.

---

### 🔹 6. Spanish‑First Design (with Future Multilingual Support)
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
| **LaTeXiS: Pegar tabla simple** | Pega una tabla copiada desde Excel/Sheets (TSV) e inserta `table` + `tabular` con `booktabs` y caption encima. |
| **LaTeXiS: Insertar tabla desde archivo Excel** | Importa una tabla rica desde un archivo `.xlsx` (celdas combinadas y alineación) e inserta los paquetes de tabla necesarios. |
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
- Las herramientas de tablas (portapapeles y Excel) están en desarrollo activo; combinaciones muy complejas de merges pueden requerir ajustes manuales.
- Las tablas ricas desde Excel aún **no** copian negritas, cursivas, subrayados ni colores de texto/fondo; solo merges y alineación básica.
- La extensión todavía no ajusta automáticamente el ancho de las tablas ni las columnas; tablas muy anchas pueden salirse del margen si no se ajustan a mano.
- El proyecto está en evolución constante: algunos cambios internos pueden romper funciones que antes funcionaban. Si notas comportamientos raros o errores, agradeceré muchísimo que los reportes mediante el repositorio (issues) o por contacto directo.

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
- Soporte completo de formato para tablas de Excel (negrita, cursiva, subrayado, colores de texto y de fondo).
- Detección automática de tamaños de tabla y anchos de columna para evitar desbordes en la página.

### 🎯 Future
- AI-based LaTeX code suggestions  
- Document structuring assistant  
- Template marketplace for universities  

---

## 👤 Author & Credits

Developed by **Luis Robles**  
Email: [albert.physik@gmail.com](mailto:albert.physik@gmail.com)  
WhatsApp: [+51 947 029 347](https://w.app/luisrobles)  

Created for students and researchers who want a **smoother transition into LaTeX**, particularly in the **Spanish-speaking academic community**.

Si te interesa un curso o taller de LaTeX/LaTeXiS, o deseas reportar un bug directamente, puedes escribirme por correo o WhatsApp.

---

## 📜 License

MIT License

---

**Enjoy LaTeX with LaTeXiS!**  
Empowering Spanish-speaking researchers, one document at a time.
