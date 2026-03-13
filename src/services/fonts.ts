const loadedFonts = new Set<string>();

const FONT_MAP: Record<string, string> = {
  'Noto Serif SC': 'Noto+Serif+SC:wght@400;700',
  'Noto Serif TC': 'Noto+Serif+TC:wght@400;700',
  'Noto Sans SC': 'Noto+Sans+SC:wght@400;700',
  'Noto Sans TC': 'Noto+Sans+TC:wght@400;700',
  'LXGW WenKai': 'LXGW+WenKai:wght@400;700',
  'LXGW WenKai TC': 'LXGW+WenKai+TC:wght@400;700',
  'Ma Shan Zheng': 'Ma+Shan+Zheng',
};

export const availableFonts = Object.keys(FONT_MAP);

export function loadFont(fontName: string): void {
  if (loadedFonts.has(fontName)) return;
  const spec = FONT_MAP[fontName];
  if (!spec) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
  document.head.appendChild(link);
  loadedFonts.add(fontName);
}

export function preloadDefaultFont(): void {
  loadFont('Noto Serif SC');
}
