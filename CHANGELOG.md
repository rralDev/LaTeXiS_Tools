# Change Log

All notable changes to the "latexis" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

## [0.2.3] - 2026-01

### Added
- New **TODOs Sidebar (Tree View)** providing a structured, persistent view of embedded TODOs.
- Hierarchical organization of TODOs by:
  - File
  - Chapter
  - Section
  - Subsection
  - Subsubsection
- Automatic counters for TODOs per file and per section.
- Clickable TODO items that open the source file and position the cursor at the correct line.
- Auto-refresh of the TODO tree when LaTeX files are saved.

### Changed
- TODO management workflow is now centered on the Sidebar Tree View.
- Markdown report (`TODOS.md`) is now an optional, secondary output.
- Improved TODO scanner to correctly track LaTeX structural hierarchy.

### Removed
- Interactive TODOs webview panel (deprecated in favor of the Tree View).
- Redundant TODO-related commands tied to the removed panel.

### Notes
- The new TODO system is designed for large, multi-file academic projects such as theses, books, and technical reports.