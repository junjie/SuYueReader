# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- **`npm run dev`** — Start Vite dev server (use `npx vite --host` for LAN access)
- **`npm run build`** — TypeScript type-check + Vite production build
- **`npm run preview`** — Preview production build locally
- **`npm run build:dict`** — Rebuild CC-CEDICT JSON from source (`scripts/build-cedict.mjs`)
- **`npm run build:moedict`** — Rebuild MOEDict JSON from source (`scripts/build-moedict.mjs`)
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

`TextLoader` handles three input methods (built-in texts via manifest, file upload, paste) plus `.sy` bundle import. Raw text goes through `parseText()` which returns `ParseResult { paragraphs, footnotes }`. The parser handles:

1. **Footnote extraction** — `[^key]: definition` lines (with multi-line support via 2-space indentation)
2. **Paragraph splitting** — `\n\n+` splits paragraphs; single `\n` preserved as `<br>`
3. **Heading detection** — `# Heading` → `<h2>`, `## Sub` → `<h3>` (single-line paragraphs only)
4. **Inline formatting** — `**bold**`, `__underline__`, `{color:text}` (purple/pink/orange/mint/blue), `[^word]` footnote references

Each paragraph carries optional `formatting` (character offset ranges) and `footnoteRanges` (position + key). Footnote ranges force whole-phrase segmentation so multi-character footnoted words stay as one tappable unit.

### Dictionary & Definition Popup

`services/dictionary.ts` lazy-loads CC-CEDICT (`dict/cedict.json`) on first lookup. Per-text cache (`preloadWords` / `cachedLookup`) populated after segmentation for instant popup display. Three dictionary sources: **CC-CEDICT** (single JSON, always loaded), **CVDICT** (Cantonese readings, single JSON), and **MOEDict** (Taiwan Ministry of Education dictionary, split into 20 sharded files `moedict-00.json`–`moedict-19.json`, loaded on-demand). MOEDict is disabled by default and enabled in settings.

**Multi-source definitions**: The popup shows footnote notes (from `[^word]: ...` in the text file) above dictionary entries, with source labels when multiple exist. Footnote lookup uses `data-footnote-key` attributes on word spans (position-based matching, not word-text matching) so phrases split by the segmenter still resolve correctly.

**Popup interaction**: Desktop hover shows popup with 50ms debounce; click pins it open. Pinned popups stay until click-outside or scroll. Touch devices toggle on tap. Character drill-down on multi-char words, with back navigation.

### Progressive 3-Phase Render

Reader `render()` runs: (1) plain text render (instant), (2) batched segmentation with word spans (20 paragraphs/batch, `setTimeout(0)` yielding), (3) definition preload. `renderGeneration` counter cancels stale renders. Progress bar in navbar tracks phase 2. Segmentation uses `Intl.Segmenter('zh', { granularity: 'word' })` with a per-character CJK fallback when the API is unavailable.

### Self-Contained Format (.sy)

JSON-based bundle: `{ version, title, text, segments?, dictionary? }`. Export from Open Sheet packages raw text + pre-computed segmentation + dictionary cache. Import skips segmenter and dictionary fetch entirely. Text is re-parsed on import so markdown/footnotes are always processed fresh.

### Line Length Constraint

`lineLength` (in `em`) sets `max-inline-size` on `#reader`. In horizontal mode this limits width; in vertical-rl mode it limits column height. The reader is centered via `margin-inline: auto`.

Two CSS custom properties are synced because `em` resolves relative to each element's own font size:
- `--reader-max-line-length` (`em`) — used on `#reader` where font-size is the reader's
- `--reader-max-line-length-px` (`lineLength * fontSize` in `px`) — used on `.navbar-inner` which has a different font-size context

### Navbar & Dropdown Menus

The navbar has a `.navbar-inner` wrapper constrained to the same width as the reader text. The navbar background spans full viewport width; only the button layout aligns with text edges.

In vertical mode, `.navbar-vertical` switches the navbar to a 48px-wide right-edge sidebar. Scroll listeners re-attach: horizontal mode listens to `window`; vertical mode listens to `#reader-container` (horizontal scroll). `scrollLeft` is negative in the RTL container.

**Open and Settings panels** are overlay dropdown menus (not bottom sheets). Each panel is positioned dynamically in JS relative to its trigger button's bounding rect — left-aligned for Open, right-aligned for Settings. In vertical mode, panels appear to the left of the sidebar. The `positionPanel()` method in each sheet class handles viewport clamping: if the button is in the bottom half, the panel anchors its bottom edge to the button and grows upward, with `max-height` set to available space. The navbar remains visible when menus are open.

### Vertical Mode CSS Coordination

- `#reader-container` uses `direction: rtl` so short content aligns right (start of vertical-rl)
- `#reader` restores `direction: ltr` for actual text
- `html:has(.vertical-mode)` locks body scroll; container handles horizontal overflow
- `#reader.vertical-mode` uses `height: auto` (not 100%) so `max-inline-size` can constrain column height
- Container uses `display: flex; align-items: center` to vertically center the reader when shorter than viewport

### Script Conversion

`services/script-convert.ts` lazy-loads **opencc-js** via dynamic import. Two converters are cached (`toSimplified`, `toTraditional`). Also normalizes punctuation (Western quotes ↔ CJK quotes). `Reader` applies conversion during render when `scriptVariantChanged` is flagged in the event detail.

### Color Highlights

Five highlight colors (Apple Notes palette) via `{color:text}` syntax. CSS classes `.hl-purple`, `.hl-pink`, `.hl-orange`, `.hl-mint`, `.hl-blue` with light/dark/sepia variants. Nesting with bold/underline supported: `{purple:**bold purple**}`.

### Other Key Patterns

- **Paragraph numbering** uses CSS `::before { content: attr(data-index) }` — not rendered in HTML
- **Theme** uses `[data-theme]` attribute selector with semantic CSS variables defined in `themes.css`
- **Fonts** are loaded on-demand from Google Fonts CDN by injecting `<link>` tags (`services/fonts.ts`); font names are display names (e.g. "Noto Serif") resolved to SC/TC variants based on `scriptVariant`
- **Pinyin-pro** (~300KB) is code-split by Vite and only loaded when the user enables pinyin
- **Built-in texts** live in `public/texts/` with a `manifest.json` mapping IDs to titles; URL param `?text=001` deep-links to a specific text
- **Service worker** (`public/sw.js`) provides offline caching, registered in `main.ts`
- **Build scripts** in `scripts/` contain dictionary build utilities (`build-cedict.mjs`, `build-moedict.mjs`, `build-cvdict.mjs`)

## Deployment

`base: '/SuYueReader/'` in `vite.config.ts` — built for GitHub Pages at `/SuYueReader/`. GitHub Actions workflow (`.github/workflows/deploy.yml`) auto-deploys on push to `main`.
