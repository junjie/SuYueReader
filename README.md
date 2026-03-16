# 素閱 SuYue Reader

A distraction-free Chinese reading app with built-in dictionary lookup, pinyin annotations, and fine-grained typography controls. Runs entirely in the browser — no server, no accounts, no tracking.

**[Try it live](https://junjie.github.io/SuYueReader/)**

## Features

- **Tap-to-define** — tap any word for instant dictionary definitions (CC-CEDICT, 國語辭典, CVDICT)
- **Pinyin overlay** — toggle ruby pinyin annotations above characters
- **Horizontal & vertical layout** — switch between standard horizontal and traditional 豎排 (vertical right-to-left) reading modes
- **Script conversion** — read any text in its original script, simplified, or traditional Chinese (powered by OpenCC)
- **Themes** — light, dark, and sepia
- **Typography controls** — font size, line height, line length, paragraph spacing, hanging indent, bold text, paragraph numbering
- **Multiple fonts** — system fonts plus on-demand Google Fonts loading
- **File support** — open `.txt`, `.docx`, and `.pdf` files, or paste text directly
- **Self-contained `.sy` bundles** — export a text with pre-computed segmentation and dictionary cache for instant offline reading
- **Footnotes & formatting** — markdown-style bold, underline, color highlights, headings, and `[^footnote]` references
- **Built-in texts** — ships with a small library; deep-link via `?text=001`
- **Offline-capable** — service worker caches the app for use without a connection
- **Privacy-first** — all text processing and dictionary lookup happens on-device

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:5173/SuYueReader/` in your browser.

### Build for production

```bash
npm run build
npm run preview
```

### Build dictionary data

```bash
npm run build:dict     # CC-CEDICT
npm run build:moedict  # 國語辭典
```

## Tech Stack

- **TypeScript** + **Vite** — no framework, vanilla event-driven architecture
- **pinyin-pro** — pinyin generation
- **opencc-js** — simplified/traditional conversion
- **mammoth** — DOCX parsing
- **pdfjs-dist** — PDF text extraction

## Deployment

Automatically deployed to GitHub Pages on push to `main` via GitHub Actions.

## License

[Apache License 2.0](LICENSE)
