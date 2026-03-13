# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **`npm run dev`** — Start Vite dev server (use `npx vite --host` for LAN access)
- **`npm run build`** — TypeScript type-check + Vite production build
- **`npm run preview`** — Preview production build locally
- No test runner configured

## Architecture

Vanilla TypeScript + Vite app (no framework). Event-driven state management with CSS-driven rendering.

### State Flow

`SettingsStore` is the single source of truth. On every `update()` call it:
1. Merges the partial update into settings
2. Persists to `localStorage`
3. Syncs CSS custom properties on `document.documentElement` (`--reader-font-size`, `--reader-line-height`, etc.)
4. Sets `data-theme` attribute on `<html>`
5. Dispatches a `settings-changed` CustomEvent on `document`

Components listen to this event. Most setting changes are **CSS-only** — no DOM re-render. The only setting that triggers a full HTML re-render is toggling pinyin (because it wraps each CJK character in `<ruby>` elements).

### Text Pipeline

`TextLoader` handles three input methods (built-in texts via manifest, file upload, paste). Raw text goes through `parseText()` (splits by `\n\n`, fallback `\n`) into `Paragraph[]`, then `Reader.setParagraphs()` renders the DOM. If pinyin is enabled, each paragraph runs through `annotateWithPinyin()` which lazy-loads `pinyin-pro` via dynamic `import()`.

### Key Patterns

- **Paragraph numbering** uses CSS `::before { content: attr(data-index) }` — not rendered in HTML
- **Theme** uses `[data-theme]` attribute selector with semantic CSS variables defined in `themes.css`
- **Fonts** are loaded on-demand from Google Fonts CDN by injecting `<link>` tags (`services/fonts.ts`)
- **Pinyin-pro** (~300KB) is code-split by Vite and only loaded when the user enables pinyin
- **Built-in texts** live in `public/texts/` with a `manifest.json` mapping IDs to titles; URL param `?text=001` deep-links to a specific text

## Deployment

`base: '/ChineseReader/'` in `vite.config.ts` — built for GitHub Pages at `/ChineseReader/`.
