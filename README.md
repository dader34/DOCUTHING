# DOCUTHING

Client-side PDF editor and toolkit. All processing happens in the browser — no files are uploaded to a server.

## Features

**Main Editor** (`/editor`) — Full-page PDF editor with toolbar. Supports:
- Add text annotations (drag, resize, style with font size and color)
- Rotate pages
- Delete pages
- Reorder pages
- Extract pages
- Split PDF
- Compress PDF
- Session persistence via localStorage
- Undo/redo, copy/paste, snap guides
- Responsive layout with auto-fit zoom on mobile

**Standalone Tools** — Individual pages for single operations:
- `/merge` — Merge multiple PDFs into one
- `/split` — Split a PDF into separate files
- `/compress` — Reduce PDF file size
- `/rotate` — Rotate PDF pages
- `/delete-pages` — Remove pages from a PDF
- `/reorder` — Rearrange page order
- `/extract` — Extract specific pages
- `/pdf-to-images` — Convert PDF pages to images
- `/images-to-pdf` — Combine images into a PDF

## Tech Stack

- React 19, TypeScript, Vite
- Tailwind CSS v4
- pdf-lib (PDF manipulation)
- pdfjs-dist (PDF rendering)
- react-router-dom (routing)
- react-dropzone (file upload)
- lucide-react (icons)

## Development

```
npm install
npm run dev
```

Dev server runs at `http://localhost:5173/`.

## Build

```
npm run build
npm run preview
```

Production build uses `/DOCUTHING/` as the base URL for GitHub Pages deployment. Dev mode uses `/`.
