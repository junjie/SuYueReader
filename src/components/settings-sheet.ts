import type { SettingsStore } from '../state/settings.ts';
import type { Settings, WritingMode, PinyinPosition, ThemeMode } from '../types/index.ts';
import { displayFonts, previewFontName, loadFontPreview } from '../services/fonts.ts';

export class SettingsSheet {
  private overlay: HTMLElement | null = null;
  private store: SettingsStore;
  private view: 'main' | 'advanced' | 'pinyin' | 'font' = 'main';

  constructor(store: SettingsStore) {
    this.store = store;
  }

  toggle(): void {
    if (this.overlay) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    if (this.overlay) return;
    document.dispatchEvent(new CustomEvent('sheet-opening', { detail: 'settings' }));

    this.view = 'main';
    this.overlay = document.createElement('div');
    this.overlay.className = 'sheet-overlay';

    const panel = document.createElement('div');
    panel.className = 'sheet-panel';
    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);

    this.buildMainView(panel);
    this.syncUI(panel);

    panel.getBoundingClientRect();
    requestAnimationFrame(() => this.overlay?.classList.add('open'));

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    const handler = () => {
      if (this.overlay) {
        const p = this.overlay.querySelector<HTMLElement>('.sheet-panel');
        if (p) this.syncUI(p);
      }
    };
    document.addEventListener('settings-changed', handler);
    (this.overlay as any)._cleanup = () => document.removeEventListener('settings-changed', handler);
  }

  close(): void {
    if (!this.overlay) return;
    const overlay = this.overlay;
    (overlay as any)._cleanup?.();
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 350);
    this.overlay = null;
    document.dispatchEvent(new CustomEvent('sheet-closed'));
  }

  private buildMainView(panel: HTMLElement): void {
    this.view = 'main';
    panel.innerHTML = `
      <div class="sheet-header">
        <span class="sheet-nav-back" style="visibility:hidden">‹</span>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Font</label>
          <div class="font-size-controls">
            <button class="pinyin-opts-btn" id="s-font-opts" aria-label="Font Options">⋯</button>
            <button class="size-btn" id="s-fontsize-down">A</button>
            <span id="s-fontsize-val" class="size-value"></span>
            <button class="size-btn size-btn-large" id="s-fontsize-up">A</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Theme</label>
          <div class="theme-swatches" id="s-theme-group">
            <button data-theme="light" class="theme-swatch" style="background:#faf8f5;border-color:#ccc" aria-label="Light">
              <span class="swatch-char" style="color:#1a1a1a">文</span>
            </button>
            <button data-theme="dark" class="theme-swatch" style="background:#1a1a1a;border-color:#444" aria-label="Dark">
              <span class="swatch-char" style="color:#e0ddd8">文</span>
            </button>
            <button data-theme="sepia" class="theme-swatch" style="background:#f5e6c8;border-color:#d4c4a8" aria-label="Sepia">
              <span class="swatch-char" style="color:#5b4636">文</span>
            </button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Writing Mode</label>
          <div class="segmented-control" id="s-mode-group">
            <button data-mode="horizontal" class="seg-btn">Horizontal</button>
            <button data-mode="vertical" class="seg-btn">Vertical</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static toggle-row">
          <label>Pinyin</label>
          <div class="pinyin-toggle-group">
            <button class="pinyin-opts-btn" id="s-pinyin-opts" aria-label="Pinyin Options">⋯</button>
            <label class="ios-switch">
              <input type="checkbox" id="s-pinyin" />
              <span class="ios-switch-track"></span>
            </label>
          </div>
        </div>
      </div>

      <div class="sheet-group">
        <button class="sheet-group-row" id="s-more">
          <span>More Options</span>
          <span class="row-chevron">›</span>
        </button>
      </div>
    `;

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());

    // Font size
    panel.querySelector('#s-fontsize-down')!.addEventListener('click', () => {
      const s = this.store.get();
      this.store.update({ fontSize: Math.max(14, s.fontSize - 2) });
    });
    panel.querySelector('#s-fontsize-up')!.addEventListener('click', () => {
      const s = this.store.get();
      this.store.update({ fontSize: Math.min(48, s.fontSize + 2) });
    });

    // Font options drill-in
    panel.querySelector('#s-font-opts')!.addEventListener('click', () => {
      this.buildFontView(panel);
      this.syncUI(panel);
    });

    // Theme
    panel.querySelector('#s-theme-group')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-theme]');
      if (btn) this.store.update({ theme: btn.dataset.theme as ThemeMode });
    });

    // Writing mode
    panel.querySelector('#s-mode-group')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]');
      if (btn) this.store.update({ writingMode: btn.dataset.mode as WritingMode });
    });

    // Pinyin toggle
    panel.querySelector<HTMLInputElement>('#s-pinyin')!.addEventListener('change', (e) => {
      this.store.update({ showPinyin: (e.target as HTMLInputElement).checked });
    });

    // Pinyin options drill-in
    panel.querySelector('#s-pinyin-opts')!.addEventListener('click', () => {
      this.buildPinyinView(panel);
      this.syncUI(panel);
    });

    // More options
    panel.querySelector('#s-more')!.addEventListener('click', () => {
      this.buildAdvancedView(panel);
      this.syncUI(panel);
    });
  }

  private buildAdvancedView(panel: HTMLElement): void {
    this.view = 'advanced';
    panel.innerHTML = `
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Line Height</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-lineheight-down">−</button>
            <span id="s-lineheight-val" class="size-value"></span>
            <button class="size-btn" id="s-lineheight-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Paragraph Spacing</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-paraspacing-down">−</button>
            <span id="s-paraspacing-val" class="size-value"></span>
            <button class="size-btn" id="s-paraspacing-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Line Length</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-linelen-down">−</button>
            <span id="s-linelen-val" class="size-value"></span>
            <button class="size-btn" id="s-linelen-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>V Margin</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-marginv-down">−</button>
            <span id="s-marginv-val" class="size-value"></span>
            <button class="size-btn" id="s-marginv-up">+</button>
          </div>
        </div>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static toggle-row">
          <label>Paragraph Numbers</label>
          <label class="ios-switch">
            <input type="checkbox" id="s-numbering" />
            <span class="ios-switch-track"></span>
          </label>
        </div>
      </div>

      <div class="sheet-group">
        <button class="sheet-group-row reset-row" id="s-reset">
          <span>Reset to Defaults</span>
        </button>
      </div>
    `;

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());

    panel.querySelector('#s-back')!.addEventListener('click', () => {
      this.buildMainView(panel);
      this.syncUI(panel);
    });

    const isVertical = this.store.get().writingMode === 'vertical';
    this.bindStepper(panel, 's-lineheight', 1.2, 3.5, 0.1, 'lineHeight');
    this.bindStepper(panel, 's-paraspacing', 0, 4, 0.25, isVertical ? 'verticalParagraphSpacing' : 'paragraphSpacing');
    this.bindStepper(panel, 's-linelen', 20, 60, 5, 'lineLength');
    this.bindStepper(panel, 's-marginv', 0, 100, 4, isVertical ? 'verticalMarginV' : 'marginV');

    panel.querySelector<HTMLInputElement>('#s-numbering')!.addEventListener('change', (e) => {
      this.store.update({ showNumbering: (e.target as HTMLInputElement).checked });
    });

    panel.querySelector('#s-reset')!.addEventListener('click', () => {
      this.store.reset();
      // Font will be loaded via syncCSS on reset
    });
  }

  private buildFontView(panel: HTMLElement): void {
    this.view = 'font';
    panel.innerHTML = `
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Font Size</label>
          <div class="font-size-controls">
            <button class="size-btn" id="s-fontsize-down">A</button>
            <span id="s-fontsize-val" class="size-value"></span>
            <button class="size-btn size-btn-large" id="s-fontsize-up">A</button>
          </div>
        </div>
      </div>

      <div class="font-scroll-row" id="s-font-list">
        ${displayFonts.map((f) => `<button class="font-card" data-font="${f}"><span class="font-card-preview" style="font-family:'${previewFontName(f)}',serif">文字</span><span class="font-card-name">${f}</span></button>`).join('')}
      </div>
    `;

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());

    panel.querySelector('#s-back')!.addEventListener('click', () => {
      this.buildMainView(panel);
      this.syncUI(panel);
    });

    panel.querySelector('#s-fontsize-down')!.addEventListener('click', () => {
      const s = this.store.get();
      this.store.update({ fontSize: Math.max(14, s.fontSize - 2) });
    });
    panel.querySelector('#s-fontsize-up')!.addEventListener('click', () => {
      const s = this.store.get();
      this.store.update({ fontSize: Math.min(48, s.fontSize + 2) });
    });

    panel.querySelector('#s-font-list')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-font]');
      if (btn) {
        const font = btn.dataset.font!;
        // Font loading happens in syncCSS via resolveFont
        this.store.update({ fontFamily: font });
      }
    });

    // Load lightweight previews (only a few glyphs each)
    displayFonts.forEach((f) => loadFontPreview(f));
  }

  private buildPinyinView(panel: HTMLElement): void {
    this.view = 'pinyin';
    panel.innerHTML = `
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Pinyin Position</label>
          <div class="segmented-control" id="s-pypos-group">
            <button data-pos="over" class="seg-btn">Above</button>
            <button data-pos="under" class="seg-btn">Below</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>Pinyin Size</label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-pysize-down">−</button>
            <span id="s-pysize-val" class="size-value"></span>
            <button class="size-btn" id="s-pysize-up">+</button>
          </div>
        </div>
      </div>
    `;

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());

    panel.querySelector('#s-back')!.addEventListener('click', () => {
      this.buildMainView(panel);
      this.syncUI(panel);
    });

    panel.querySelector('#s-pypos-group')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-pos]');
      if (btn) this.store.update({ pinyinPosition: btn.dataset.pos as PinyinPosition });
    });

    this.bindStepper(panel, 's-pysize', 8, 20, 1, 'pinyinSize');
  }

  private bindStepper(panel: HTMLElement, id: string, min: number, max: number, step: number, key: keyof Settings): void {
    panel.querySelector(`#${id}-down`)!.addEventListener('click', () => {
      const cur = this.store.get()[key] as number;
      this.store.update({ [key]: Math.max(min, Math.round((cur - step) * 100) / 100) });
    });
    panel.querySelector(`#${id}-up`)!.addEventListener('click', () => {
      const cur = this.store.get()[key] as number;
      this.store.update({ [key]: Math.min(max, Math.round((cur + step) * 100) / 100) });
    });
  }

  private syncUI(panel: HTMLElement): void {
    const s: Settings = this.store.get();

    if (this.view === 'main') {
      const fsVal = panel.querySelector('#s-fontsize-val');
      if (fsVal) fsVal.textContent = `${s.fontSize}px`;

      panel.querySelectorAll('#s-theme-group .theme-swatch').forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.theme === s.theme);
      });

      panel.querySelectorAll('#s-mode-group .seg-btn').forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === s.writingMode);
      });

      const pyCheck = panel.querySelector<HTMLInputElement>('#s-pinyin');
      if (pyCheck) pyCheck.checked = s.showPinyin;

      const pyOptsBtn = panel.querySelector<HTMLElement>('#s-pinyin-opts');
      if (pyOptsBtn) pyOptsBtn.style.display = s.showPinyin ? '' : 'none';
    } else if (this.view === 'advanced') {
      const isVertical = s.writingMode === 'vertical';
      this.setStepperVal(panel, 's-lineheight', `${s.lineHeight}`);
      this.setStepperVal(panel, 's-paraspacing', `${isVertical ? s.verticalParagraphSpacing : s.paragraphSpacing}em`);
      this.setStepperVal(panel, 's-linelen', `${s.lineLength}字`);
      this.setStepperVal(panel, 's-marginv', `${isVertical ? s.verticalMarginV : s.marginV}px`);

      const numCheck = panel.querySelector<HTMLInputElement>('#s-numbering');
      if (numCheck) numCheck.checked = s.showNumbering;
    } else if (this.view === 'font') {
      const fsVal = panel.querySelector('#s-fontsize-val');
      if (fsVal) fsVal.textContent = `${s.fontSize}px`;

      panel.querySelectorAll('#s-font-list .font-card').forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.font === s.fontFamily);
      });
    } else if (this.view === 'pinyin') {
      panel.querySelectorAll('#s-pypos-group .seg-btn').forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.pos === s.pinyinPosition);
      });

      this.setStepperVal(panel, 's-pysize', `${s.pinyinSize}px`);
    }
  }

  private setStepperVal(panel: HTMLElement, id: string, display: string): void {
    const valSpan = panel.querySelector(`#${id}-val`);
    if (valSpan) valSpan.textContent = display;
  }
}
