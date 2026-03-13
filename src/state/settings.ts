import type { Settings } from '../types/index.ts';
import { defaultSettings } from './defaults.ts';

const STORAGE_KEY = 'chinese-reader-settings';

export class SettingsStore {
  private settings: Settings;

  constructor() {
    this.settings = this.load();
    this.syncCSS();
    this.syncTheme();
  }

  private load(): Settings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...defaultSettings, ...JSON.parse(stored) };
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

    document.dispatchEvent(
      new CustomEvent('settings-changed', {
        detail: { settings: this.get(), pinyinChanged, writingModeChanged, prevWritingMode: prev.writingMode },
      })
    );
  }

  reset(): void {
    this.update({ ...defaultSettings });
  }

  private syncCSS(): void {
    const s = this.settings;
    const root = document.documentElement.style;
    root.setProperty('--reader-font-family', `"${s.fontFamily}", serif`);
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
    root.setProperty('--pinyin-size', `${s.pinyinSize}px`);
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
