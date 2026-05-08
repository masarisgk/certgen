# CertGen

CertGen is a visual certificate editor and bulk generator built with Next.js. It lets you place text, images, shapes, and background layers on top of a PDF/image template, then export single or bulk certificates as PDF/JPG.

## Features

- Visual PDF/image certificate editor
- Blank project creation with A4, A5, F4, or custom canvas sizes
- Text, image, shape, and background image layers
- Layer controls for visibility, duplicate, delete, reorder, lock-aware editing, and background layer handling
- Drag, resize, snapping guides, zoom, pan, undo, and redo
- Text styling with Google Fonts, weight, alignment, effects, transform, spacing, line height, opacity, rotation, auto resize, and shadow
- Image controls including upload, object fit, border, opacity, rotation, and filters
- Background editor from the menubar with base color and resizable background image layer
- CSV bulk generation with preview row navigation
- Header validation for text fields and filename placeholders
- Filename pattern support with automatic extension handling
- Export single certificate as PDF or JPG
- Bulk export as ZIP of PDFs or JPGs
- Print generated certificate from the File menu
- Local autosave for project state and template PDF
- Project import/export as JSON
- Light/dark theme support

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## Bulk CSV Format

Bulk generation maps CSV headers to text layer labels. For example, if a text layer is named `nama`, the CSV must include a `nama` header.

Filename patterns can use:

- `{row}` for the current row number
- CSV headers such as `{nama}` or `{judul}`

Do not include file extensions in the filename pattern. CertGen adds `.pdf` or `.jpg` automatically based on the selected export type.

## Project Files

Use **File -> Save Project** to export a JSON project file. Use **File -> Open Project** to restore a saved project.

Project files can include:

- template PDF/image data
- layers and layout settings
- bulk rows
- filename pattern

## Notes

This project uses Next.js 16. Follow the local agent guidance in `AGENTS.md` when making framework-level changes.

## Author

masarisgk
