import type { SettingsStore } from '../state/settings.ts';
import type { Settings, WritingMode, PinyinPosition, ThemeMode } from '../types/index.ts';
import { availableFonts, loadFont } from '../services/fonts.ts';
import { defaultSettings } from '../state/defaults.ts';

export class SettingsSheet {
  private overlay: HTMLElement | null = null;
  private store: SettingsStore;
  private view: 'main' | 'advanced' = 'main';

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
      <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>Font Size</label>
          <div class="font-size-controls">
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
          <label class="ios-switch">
            <input type="checkbox" id="s-pinyin" />
            <span class="ios-switch-track"></span>
          </label>
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

    // More options
    panel.querySelector('#s-more')!.addEventListener('click', () => {
      this.buildAdvancedView(panel);
      this.syncUI(panel);
    });
  }

  private buildAdvancedView(panel: HTMLElement): void {
    this.view = 'advanced';
    const s = this.store.get();
    panel.innerHTML = `
      <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>

      <div class="sheet-group">
        <button class="sheet-group-row" id="s-back">
          <span class="row-chevron back">‹</span>
          <span>Back</span>
        </button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label for="s-font">Font Family</label>
          <select id="s-font" class="inline-select">
            ${availableFonts.map((f) => `<option value="${f}">${f}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static slider-row">
          <label>Line Height <span id="s-lineheight-val"></span></label>
          <input type="range" id="s-lineheight" min="1.2" max="3.5" step="0.1" />
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static slider-row">
          <label>Paragraph Spacing <span id="s-paraspacing-val"></span></label>
          <input type="range" id="s-paraspacing" min="0" max="4" step="0.25" />
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static slider-row">
          <label>H Margin <span id="s-marginh-val"></span></label>
          <input type="range" id="s-marginh" min="0" max="200" step="8" />
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static slider-row">
          <label>V Margin <span id="s-marginv-val"></span></label>
          <input type="range" id="s-marginv" min="0" max="100" step="4" />
        </div>
      </div>

      <div class="sheet-group" id="pinyin-options" style="${s.showPinyin ? '' : 'display:none'}">
        <div class="sheet-group-row static">
          <label>Pinyin Position</label>
          <div class="segmented-control" id="s-pypos-group">
            <button data-pos="over" class="seg-btn">Above</button>
            <button data-pos="under" class="seg-btn">Below</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static slider-row">
          <label>Pinyin Size <span id="s-pysize-val"></span></label>
          <input type="range" id="s-pysize" min="8" max="20" step="1" />
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

    panel.querySelector<HTMLSelectElement>('#s-font')!.addEventListener('change', (e) => {
      const font = (e.target as HTMLSelectElement).value;
      loadFont(font);
      this.store.update({ fontFamily: font });
    });

    this.bindSlider(panel, 's-lineheight', (v) => this.store.update({ lineHeight: Number(v) }));
    this.bindSlider(panel, 's-paraspacing', (v) => this.store.update({ paragraphSpacing: Number(v) }));
    this.bindSlider(panel, 's-marginh', (v) => this.store.update({ marginH: Number(v) }));
    this.bindSlider(panel, 's-marginv', (v) => this.store.update({ marginV: Number(v) }));
    this.bindSlider(panel, 's-pysize', (v) => this.store.update({ pinyinSize: Number(v) }));

    panel.querySelector('#s-pypos-group')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-pos]');
      if (btn) this.store.update({ pinyinPosition: btn.dataset.pos as PinyinPosition });
    });

    panel.querySelector<HTMLInputElement>('#s-numbering')!.addEventListener('change', (e) => {
      this.store.update({ showNumbering: (e.target as HTMLInputElement).checked });
    });

    panel.querySelector('#s-reset')!.addEventListener('click', () => {
      this.store.reset();
      loadFont(defaultSettings.fontFamily);
    });
  }

  private bindSlider(panel: HTMLElement, id: string, onChange: (value: string) => void): void {
    const slider = panel.querySelector<HTMLInputElement>(`#${id}`);
    slider?.addEventListener('input', () => onChange(slider.value));
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
    } else {
      const fontSel = panel.querySelector<HTMLSelectElement>('#s-font');
      if (fontSel) fontSel.value = s.fontFamily;

      this.setSlider(panel, 's-lineheight', s.lineHeight, `${s.lineHeight}`);
      this.setSlider(panel, 's-paraspacing', s.paragraphSpacing, `${s.paragraphSpacing}em`);
      this.setSlider(panel, 's-marginh', s.marginH, `${s.marginH}px`);
      this.setSlider(panel, 's-marginv', s.marginV, `${s.marginV}px`);
      this.setSlider(panel, 's-pysize', s.pinyinSize, `${s.pinyinSize}px`);

      const pyOpts = panel.querySelector<HTMLElement>('#pinyin-options');
      if (pyOpts) pyOpts.style.display = s.showPinyin ? '' : 'none';

      panel.querySelectorAll('#s-pypos-group .seg-btn').forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.pos === s.pinyinPosition);
      });

      const numCheck = panel.querySelector<HTMLInputElement>('#s-numbering');
      if (numCheck) numCheck.checked = s.showNumbering;
    }
  }

  private setSlider(panel: HTMLElement, id: string, value: number, display: string): void {
    const slider = panel.querySelector<HTMLInputElement>(`#${id}`);
    if (slider) slider.value = String(value);
    const valSpan = panel.querySelector(`#${id}-val`);
    if (valSpan) valSpan.textContent = display;
  }
}
