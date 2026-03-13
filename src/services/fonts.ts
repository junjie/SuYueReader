import type { ScriptVariant } from '../types/index.ts';

const loadedFonts = new Set<string>();
const loadedPreviews = new Set<string>();

/** Google Fonts spec for each loadable font */
const FONT_SPEC: Record<string, string> = {
  'Noto Serif SC': 'Noto+Serif+SC:wght@400;700',
  'Noto Serif TC': 'Noto+Serif+TC:wght@400;700',
  'Noto Sans SC': 'Noto+Sans+SC:wght@400;700',
  'Noto Sans TC': 'Noto+Sans+TC:wght@400;700',
  'LXGW WenKai TC': 'LXGW+WenKai+TC:wght@400;700',
  'Ma Shan Zheng': 'Ma+Shan+Zheng',
};

/** Display fonts the user picks from (script-neutral) */
export const displayFonts = [
  'Noto Serif',
  'Noto Sans',
  'LXGW WenKai',
  'Ma Shan Zheng',
];

/** Maps display font → { sc, tc } actual font names */
const FONT_VARIANTS: Record<string, { sc: string; tc: string }> = {
  'Noto Serif':    { sc: 'Noto Serif SC',   tc: 'Noto Serif TC' },
  'Noto Sans':     { sc: 'Noto Sans SC',    tc: 'Noto Sans TC' },
  'LXGW WenKai':  { sc: 'LXGW WenKai TC',  tc: 'LXGW WenKai TC' },  // TC covers both
  'Ma Shan Zheng': { sc: 'Ma Shan Zheng',   tc: 'Ma Shan Zheng' },   // no TC variant
};

/**
 * Resolve a display font + script variant to the actual font name to load/use.
 * For "original" we default to SC.
 */
export function resolveFont(displayFont: string, variant: ScriptVariant): string {
  const pair = FONT_VARIANTS[displayFont];
  if (!pair) return displayFont; // unknown font, pass through
  return variant === 'traditional' ? pair.tc : pair.sc;
}

/** Preview font name for the font picker (use TC since it covers both) */
export function previewFontName(displayFont: string): string {
  const pair = FONT_VARIANTS[displayFont];
  if (!pair) return displayFont;
  return pair.tc;
}

export function loadFont(fontName: string): void {
  if (loadedFonts.has(fontName)) return;
  const spec = FONT_SPEC[fontName];
  if (!spec) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

export function loadFontPreview(displayFont: string): void {
  // Load the TC variant for preview (covers both scripts)
  const fontName = previewFontName(displayFont);
  if (loadedFonts.has(fontName) || loadedPreviews.has(fontName)) return;
  const spec = FONT_SPEC[fontName];
  if (!spec) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap&text=${encodeURIComponent('Aa文字')}`;
  document.head.appendChild(link);
  loadedPreviews.add(fontName);
}

export function preloadDefaultFont(): void {
  loadFont('Noto Serif SC');
}
