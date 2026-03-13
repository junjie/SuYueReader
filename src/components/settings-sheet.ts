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

    document.addEventListener('sheet-opening', (e: Event) => {
      if ((e as CustomEvent).detail !== 'settings') this.close();
    });
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
    this.overlay.className = 'settings-sheet-overlay';

    const panel = document.createElement('div');
    panel.className = 'settings-sheet-panel';
    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);

    this.buildMainView(panel);
    this.syncUI(panel);

    // Force reflow then animate
    panel.getBoundingClientRect();
    requestAnimationFrame(() => this.overlay?.classList.add('open'));

    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    // Listen for settings changes to sync UI
    const handler = () => {
      if (this.overlay) {
        const p = this.overlay.querySelector<HTMLElement>('.settings-sheet-panel');
        if (p) this.syncUI(p);
      }
    };
    document.addEventListener('settings-changed', handler);
    // Store cleanup ref
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
      <div class="sheet-drag-indicator"></div>
      <div class="settings-sheet-body">
        <section class="settings-row">
          <label>Font Size</label>
          <div class="font-size-controls">
            <button class="sheet-btn font-size-btn" id="s-fontsize-down">A</button>
            <span id="s-fontsize-val" class="font-size-value"></span>
            <button class="sheet-btn font-size-btn font-size-btn-large" id="s-fontsize-up">A</button>
          </div>
        </section>

        <section class="settings-row">
          <label>Theme</label>
          <div class="segmented-control" id="s-theme-group">
            <button data-theme="light" class="seg-btn">Light</button>
            <button data-theme="dark" class="seg-btn">Dark</button>
            <button data-theme="sepia" class="seg-btn">Sepia</button>
          </div>
        </section>

        <section class="settings-row">
          <label>Writing Mode</label>
          <div class="segmented-control" id="s-mode-group">
            <button data-mode="horizontal" class="seg-btn">Horizontal</button>
            <button data-mode="vertical" class="seg-btn">Vertical</button>
          </div>
        </section>

        <section class="settings-row toggle-row">
          <label for="s-pinyin">Pinyin</label>
          <input type="checkbox" id="s-pinyin" class="toggle-input" />
        </section>

        <section class="settings-row more-row">
          <button class="sheet-btn more-btn" id="s-more">More Options ›</button>
        </section>
      </div>
    `;

    // Font size buttons
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
      <div class="sheet-drag-indicator"></div>
      <div class="settings-sheet-body">
        <section class="settings-row">
          <button class="sheet-btn back-btn" id="s-back">‹ Back</button>
        </section>

        <section class="settings-row">
          <label for="s-font">Font Family</label>
          <select id="s-font" class="sheet-select">
            ${availableFonts.map((f) => `<option value="${f}">${f}</option>`).join('')}
          </select>
        </section>

        <section class="settings-row">
          <label>Line Height: <span id="s-lineheight-val"></span></label>
          <input type="range" id="s-lineheight" min="1.2" max="3.5" step="0.1" />
        </section>

        <section class="settings-row">
          <label>Paragraph Spacing: <span id="s-paraspacing-val"></span></label>
          <input type="range" id="s-paraspacing" min="0" max="4" step="0.25" />
        </section>

        <section class="settings-row">
          <label>Horizontal Margin: <span id="s-marginh-val"></span></label>
          <input type="range" id="s-marginh" min="0" max="200" step="8" />
        </section>

        <section class="settings-row">
          <label>Vertical Margin: <span id="s-marginv-val"></span></label>
          <input type="range" id="s-marginv" min="0" max="100" step="4" />
        </section>

        <section class="settings-row" id="pinyin-options" style="${s.showPinyin ? '' : 'display:none'}">
          <label>Pinyin Position</label>
          <div class="segmented-control" id="s-pypos-group">
            <button data-pos="over" class="seg-btn">Above</button>
            <button data-pos="under" class="seg-btn">Below</button>
          </div>
          <label>Pinyin Size: <span id="s-pysize-val"></span></label>
          <input type="range" id="s-pysize" min="8" max="20" step="1" />
        </section>

        <section class="settings-row toggle-row">
          <label for="s-numbering">Paragraph Numbers</label>
          <input type="checkbox" id="s-numbering" class="toggle-input" />
        </section>

        <section class="settings-row">
          <button class="sheet-btn reset-btn" id="s-reset">Reset to Defaults</button>
        </section>
      </div>
    `;

    // Back
    panel.querySelector('#s-back')!.addEventListener('click', () => {
      this.buildMainView(panel);
      this.syncUI(panel);
    });

    // Font
    panel.querySelector<HTMLSelectElement>('#s-font')!.addEventListener('change', (e) => {
      const font = (e.target as HTMLSelectElement).value;
      loadFont(font);
      this.store.update({ fontFamily: font });
    });

    // Sliders
    this.bindSlider(panel, 's-lineheight', (v) => this.store.update({ lineHeight: Number(v) }));
    this.bindSlider(panel, 's-paraspacing', (v) => this.store.update({ paragraphSpacing: Number(v) }));
    this.bindSlider(panel, 's-marginh', (v) => this.store.update({ marginH: Number(v) }));
    this.bindSlider(panel, 's-marginv', (v) => this.store.update({ marginV: Number(v) }));
    this.bindSlider(panel, 's-pysize', (v) => this.store.update({ pinyinSize: Number(v) }));

    // Pinyin position
    panel.querySelector('#s-pypos-group')?.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-pos]');
      if (btn) this.store.update({ pinyinPosition: btn.dataset.pos as PinyinPosition });
    });

    // Numbering
    panel.querySelector<HTMLInputElement>('#s-numbering')!.addEventListener('change', (e) => {
      this.store.update({ showNumbering: (e.target as HTMLInputElement).checked });
    });

    // Reset
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
      // Font size display
      const fsVal = panel.querySelector('#s-fontsize-val');
      if (fsVal) fsVal.textContent = `${s.fontSize}px`;

      // Theme buttons
      panel.querySelectorAll('#s-theme-group .seg-btn').forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.theme === s.theme);
      });

      // Writing mode buttons
      panel.querySelectorAll('#s-mode-group .seg-btn').forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === s.writingMode);
      });

      // Pinyin checkbox
      const pyCheck = panel.querySelector<HTMLInputElement>('#s-pinyin');
      if (pyCheck) pyCheck.checked = s.showPinyin;
    } else {
      // Font select
      const fontSel = panel.querySelector<HTMLSelectElement>('#s-font');
      if (fontSel) fontSel.value = s.fontFamily;

      // Sliders
      this.setSlider(panel, 's-lineheight', s.lineHeight, `${s.lineHeight}`);
      this.setSlider(panel, 's-paraspacing', s.paragraphSpacing, `${s.paragraphSpacing}em`);
      this.setSlider(panel, 's-marginh', s.marginH, `${s.marginH}px`);
      this.setSlider(panel, 's-marginv', s.marginV, `${s.marginV}px`);
      this.setSlider(panel, 's-pysize', s.pinyinSize, `${s.pinyinSize}px`);

      // Pinyin options visibility
      const pyOpts = panel.querySelector<HTMLElement>('#pinyin-options');
      if (pyOpts) pyOpts.style.display = s.showPinyin ? '' : 'none';

      // Pinyin position buttons
      panel.querySelectorAll('#s-pypos-group .seg-btn').forEach((btn) => {
        btn.classList.toggle('active', (btn as HTMLElement).dataset.pos === s.pinyinPosition);
      });

      // Numbering checkbox
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
