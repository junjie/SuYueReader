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

  'Huninn': 'Huninn',
  'Iansui': 'Iansui',
};

/** Display fonts the user picks from (script-neutral) */
export const displayFonts = [
  'Noto Serif',
  'Noto Sans',
  'LXGW WenKai',

  'Huninn',
  'Iansui',
];

/** System fonts available on macOS/iOS and Windows */
export const systemFonts = [
  // macOS / iOS
  { display: 'PingFang',    sc: 'PingFang SC',      tc: 'PingFang TC',         family: 'sans-serif' as const },
  { display: 'Songti',      sc: 'Songti SC',         tc: 'Songti TC',           family: 'serif' as const },
  { display: 'Kaiti',       sc: 'Kaiti SC',           tc: 'Kaiti TC',            family: 'serif' as const },
  { display: 'STFangsong',  sc: 'STFangsong',         tc: 'STFangsong',          family: 'serif' as const },
  // Windows
  { display: 'Microsoft YaHei',  sc: 'Microsoft YaHei',    tc: 'Microsoft JhengHei',  family: 'sans-serif' as const },
  { display: 'SimSun',           sc: 'SimSun',              tc: 'MingLiU',              family: 'serif' as const },
  { display: 'KaiTi',            sc: 'KaiTi',               tc: 'DFKai-SB',             family: 'serif' as const },
  { display: 'FangSong',         sc: 'FangSong',             tc: 'FangSong',              family: 'serif' as const },
];

/** Maps display font → { sc, tc } actual font names */
const FONT_VARIANTS: Record<string, { sc: string; tc: string }> = {
  'Noto Serif':    { sc: 'Noto Serif SC',   tc: 'Noto Serif TC' },
  'Noto Sans':     { sc: 'Noto Sans SC',    tc: 'Noto Sans TC' },
  'LXGW WenKai':  { sc: 'LXGW WenKai TC',  tc: 'LXGW WenKai TC' },  // TC covers both

  'Huninn':        { sc: 'Huninn',          tc: 'Huninn' },          // TC only
  'Iansui':        { sc: 'Iansui',          tc: 'Iansui' },          // TC only
};

// Register system fonts into FONT_VARIANTS
for (const sf of systemFonts) {
  FONT_VARIANTS[sf.display] = { sc: sf.sc, tc: sf.tc };
}

const SYSTEM_FONT_SET = new Set(systemFonts.map(sf => sf.display));
const SYSTEM_FONT_FAMILY = new Map(systemFonts.map(sf => [sf.display, sf.family]));

/** Check if a display font name is a system font */
export function isSystemFont(displayFont: string): boolean {
  return SYSTEM_FONT_SET.has(displayFont);
}

/**
 * Detect if a font is installed by comparing canvas text width
 * against known fallback fonts. If the measured width differs
 * from both serif and sans-serif baselines, the font is present.
 */
const _detectCache = new Map<string, boolean>();
function isFontInstalled(fontName: string): boolean {
  const cached = _detectCache.get(fontName);
  if (cached !== undefined) return cached;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  const testStr = '測試文字ABCDwxyz';
  const size = '72px';

  ctx.font = `${size} serif`;
  const serifW = ctx.measureText(testStr).width;
  ctx.font = `${size} sans-serif`;
  const sansW = ctx.measureText(testStr).width;

  ctx.font = `${size} "${fontName}", serif`;
  const testW1 = ctx.measureText(testStr).width;
  ctx.font = `${size} "${fontName}", sans-serif`;
  const testW2 = ctx.measureText(testStr).width;

  // Font is installed if it differs from at least one baseline
  const installed = testW1 !== serifW || testW2 !== sansW;
  _detectCache.set(fontName, installed);
  return installed;
}

/** Return only system fonts that are actually installed on this device */
export function getAvailableSystemFonts(): typeof systemFonts {
  return systemFonts.filter(sf =>
    isFontInstalled(sf.sc) || isFontInstalled(sf.tc)
  );
}

/** Get the generic CSS family for a font ('serif' or 'sans-serif') */
export function fontGenericFamily(displayFont: string): string {
  return SYSTEM_FONT_FAMILY.get(displayFont) || 'serif';
}

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
