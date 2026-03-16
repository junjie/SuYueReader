import type { Settings } from '../types/index.ts';
import { defaultSettings } from './defaults.ts';
import { resolveFont, loadFont, fontGenericFamily } from '../services/fonts.ts';

const STORAGE_KEY = 'chinese-reader-settings';

export class SettingsStore {
  private settings: Settings;

  constructor() {
    this.settings = this.load();
    this.syncCSS();
    this.syncTheme();
  }

  /** Migrate old SC/TC-specific font names to display names */
  private static FONT_MIGRATION: Record<string, string> = {
    'Noto Serif SC': 'Noto Serif',
    'Noto Serif TC': 'Noto Serif',
    'Noto Sans SC': 'Noto Sans',
    'Noto Sans TC': 'Noto Sans',
    'LXGW WenKai': 'LXGW WenKai',
    'LXGW WenKai TC': 'LXGW WenKai',
  };

  private load(): Settings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old font names
        if (parsed.fontFamily && SettingsStore.FONT_MIGRATION[parsed.fontFamily]) {
          parsed.fontFamily = SettingsStore.FONT_MIGRATION[parsed.fontFamily];
        }
        // Migrate dictOrder to include moedict if missing
        if (parsed.dictOrder && !parsed.dictOrder.includes('moedict')) {
          parsed.dictOrder = [...parsed.dictOrder, 'moedict'];
        }
        return { ...defaultSettings, ...parsed };
      }
    } catch {
      // ignore
    }
    return { ...defaultSettings };
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
  }

  get(): Settings {
    return { ...this.settings };
  }

  update(partial: Partial<Settings>): void {
    const prev = { ...this.settings };
    Object.assign(this.settings, partial);
    this.save();
    this.syncCSS();
    this.syncTheme();

    const pinyinChanged =
      partial.showPinyin !== undefined && partial.showPinyin !== prev.showPinyin;
    const writingModeChanged =
      partial.writingMode !== undefined && partial.writingMode !== prev.writingMode;
    const scriptVariantChanged =
      partial.scriptVariant !== undefined && partial.scriptVariant !== prev.scriptVariant;
    const dictChanged =
      partial.showCedict !== undefined && partial.showCedict !== prev.showCedict ||
      partial.showCvdict !== undefined && partial.showCvdict !== prev.showCvdict ||
      partial.showMoedict !== undefined && partial.showMoedict !== prev.showMoedict ||
      partial.dictOrder !== undefined && JSON.stringify(partial.dictOrder) !== JSON.stringify(prev.dictOrder);

    document.dispatchEvent(
      new CustomEvent('settings-changed', {
        detail: { settings: this.get(), pinyinChanged, writingModeChanged, scriptVariantChanged, dictChanged, prevWritingMode: prev.writingMode },
      })
    );
  }

  reset(): void {
    this.update({ ...defaultSettings });
  }

  isDefault(): boolean {
    return JSON.stringify(this.settings) === JSON.stringify(defaultSettings);
  }

  isDefaultKeys(keys: (keyof Settings)[]): boolean {
    return keys.every((k) => JSON.stringify(this.settings[k]) === JSON.stringify(defaultSettings[k]));
  }

  resetKeys(keys: (keyof Settings)[]): void {
    const partial: Partial<Settings> = {};
    for (const k of keys) {
      (partial as any)[k] = (defaultSettings as any)[k];
    }
    this.update(partial);
  }

  private syncCSS(): void {
    const s = this.settings;
    const root = document.documentElement.style;
    const effectiveFont = resolveFont(s.fontFamily, s.scriptVariant);
    loadFont(effectiveFont);
    root.setProperty('--reader-font-family', `"${effectiveFont}", ${fontGenericFamily(s.fontFamily)}`);
    root.setProperty('--reader-font-size', `${s.fontSize}px`);
    root.setProperty('--reader-line-height', `${s.lineHeight}`);
    const isVertical = s.writingMode === 'vertical';
    root.setProperty('--reader-paragraph-spacing', `${isVertical ? s.verticalParagraphSpacing : s.paragraphSpacing}em`);
    root.setProperty('--reader-margin-h', `${s.marginH}px`);
    root.setProperty('--reader-margin-v', `${isVertical ? s.verticalMarginV : s.marginV}px`);
    root.setProperty(
      '--reader-writing-mode',
      s.writingMode === 'vertical' ? 'vertical-rl' : 'horizontal-tb'
    );
    root.setProperty('--reader-max-line-length', `${s.lineLength}em`);
    root.setProperty('--reader-max-line-length-px', `${s.lineLength * s.fontSize}px`);
    root.setProperty('--pinyin-size', `${s.pinyinSize}px`);
    root.setProperty('--popup-font-size', `${s.popupFontSize}px`);
    root.setProperty('--reader-hanging-indent', `${s.hangingIndent}em`);
    root.setProperty('--reader-font-weight', s.boldText ? '600' : '400');
    root.setProperty('--reader-heading-font-weight', s.boldText ? '800' : '700');
  }

  private static themeColors: Record<string, string> = {
    light: '#faf8f5',
    dark: '#1a1a1a',
    sepia: '#f5e6c8',
  };

  private syncTheme(): void {
    const theme = this.settings.theme;
    document.documentElement.setAttribute('data-theme', theme);
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (meta) meta.content = SettingsStore.themeColors[theme] || SettingsStore.themeColors.light;
  }
}
