import type { SettingsStore } from '../state/settings.ts';
import type { Settings, WritingMode, PinyinPosition, ThemeMode } from '../types/index.ts';
import { displayFonts, previewFontName, loadFontPreview } from '../services/fonts.ts';
import { convertScriptSync, uiVariant } from '../services/script-convert.ts';

export class SettingsSheet {
  private overlay: HTMLElement | null = null;
  private store: SettingsStore;
  private view: 'main' | 'advanced' | 'pinyin' | 'font' | 'dictionaries' = 'main';

  constructor(store: SettingsStore) {
    this.store = store;
  }

  /** Convert Chinese UI text to match current script variant */
  private t(html: string): string {
    return convertScriptSync(html, uiVariant(this.store.get().scriptVariant));
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
    this.positionPanel(panel);
    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);

    this.buildMainView(panel);
    this.syncUI(panel);

    panel.getBoundingClientRect();
    requestAnimationFrame(() => this.overlay?.classList.add('open'));

    // Touch: dismiss on touchstart and prevent click synthesis
    this.overlay.addEventListener('touchstart', (e) => {
      if (e.target === this.overlay) {
        e.preventDefault();
        this.close();
      }
    }, { passive: false });
    // Mouse: dismiss on click
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
    const panel = overlay.querySelector('.sheet-panel');
    if (panel) {
      panel.addEventListener('transitionend', () => overlay.remove(), { once: true });
    }
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 250);
    this.overlay = null;
    document.dispatchEvent(new CustomEvent('sheet-closed'));
  }

  private positionPanel(panel: HTMLElement): void {
    const btn = document.getElementById('navbar-settings');
    const nav = document.querySelector('.navbar');
    const isVertical = nav?.classList.contains('navbar-vertical');
    if (btn) {
      const rect = btn.getBoundingClientRect();
      const margin = 8;
      if (isVertical) {
        // Place to the left of the sidebar
        panel.style.right = `${window.innerWidth - rect.left + margin}px`;
        // Prefer aligning top with button, but clamp so panel stays in viewport
        panel.style.top = `${rect.top}px`;
        panel.style.maxHeight = `${window.innerHeight - rect.top - margin}px`;
        // If button is in bottom half, anchor to bottom instead so panel grows upward
        if (rect.top > window.innerHeight / 2) {
          panel.style.top = '';
          panel.style.bottom = `${window.innerHeight - rect.bottom}px`;
          panel.style.maxHeight = `${rect.bottom - margin}px`;
        }
      } else {
        // Place below navbar, right edge aligned with button's right edge
        panel.style.top = `${rect.bottom + margin}px`;
        panel.style.right = `${window.innerWidth - rect.right}px`;
        panel.style.maxHeight = `${window.innerHeight - rect.bottom - margin * 2}px`;
      }
    }
  }

  private buildMainView(panel: HTMLElement): void {
    this.view = 'main';
    panel.innerHTML = this.t(`
      <div class="sheet-header">
        <span class="sheet-nav-back" style="visibility:hidden">‹</span>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>字體<span class="sub">Font</span></label>
          <div class="font-size-controls">
            <button class="pinyin-opts-btn" id="s-font-opts" aria-label="Font Options">⋯</button>
            <button class="size-btn" id="s-fontsize-down">A</button>
            <span id="s-fontsize-val" class="size-value"></span>
            <button class="size-btn size-btn-large" id="s-fontsize-up">A</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>主題<span class="sub">Theme</span></label>
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
          <label>排版<span class="sub">Layout</span></label>
          <div class="segmented-control" id="s-mode-group">
            <button data-mode="horizontal" class="seg-btn">橫排<span class="seg-sub">Horizontal</span></button>
            <button data-mode="vertical" class="seg-btn">豎排<span class="seg-sub">Vertical</span></button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static toggle-row">
          <label>拼音<span class="sub">Pinyin</span></label>
          <div class="pinyin-toggle-group">
            <button class="pinyin-opts-btn" id="s-pinyin-opts" aria-label="Pinyin Options">⋯</button>
            <label class="ios-switch">
              <input type="checkbox" id="s-pinyin" />
              <span class="ios-switch-track"></span>
            </label>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" id="s-dictionaries">
          <span>詞典<span class="row-sub">Dictionaries</span></span>
          <span class="row-chevron">›</span>
        </button>
      </div>

      <div class="sheet-group">
        <button class="sheet-group-row" id="s-more">
          <span>更多選項<span class="row-sub">More Options</span></span>
          <span class="row-chevron">›</span>
        </button>
      </div>
    `);

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

    // Dictionaries drill-in
    panel.querySelector('#s-dictionaries')!.addEventListener('click', () => {
      this.buildDictionariesView(panel);
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
    panel.innerHTML = this.t(`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>行距<span class="sub">Line Height</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-lineheight-down">−</button>
            <span id="s-lineheight-val" class="size-value"></span>
            <button class="size-btn" id="s-lineheight-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>段間距<span class="sub">Paragraph Spacing</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-paraspacing-down">−</button>
            <span id="s-paraspacing-val" class="size-value"></span>
            <button class="size-btn" id="s-paraspacing-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>行寬<span class="sub">Line Length</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-linelen-down">−</button>
            <span id="s-linelen-val" class="size-value"></span>
            <button class="size-btn" id="s-linelen-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>垂直邊距<span class="sub">Vertical Margin</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-marginv-down">−</button>
            <span id="s-marginv-val" class="size-value"></span>
            <button class="size-btn" id="s-marginv-up">+</button>
          </div>
        </div>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static toggle-row">
          <label>段落編號<span class="sub">Paragraph Numbers</span></label>
          <label class="ios-switch">
            <input type="checkbox" id="s-numbering" />
            <span class="ios-switch-track"></span>
          </label>
        </div>
      </div>

      <div class="sheet-group">
        <button class="sheet-group-row reset-row" id="s-reset">
          <span>恢復預設<span class="row-sub">Reset to Defaults</span></span>
        </button>
      </div>
    `);

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
    panel.innerHTML = this.t(`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>字號<span class="sub">Font Size</span></label>
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
    `);

    // Force reflow so the panel calculates correct layout for the font row
    panel.offsetHeight;

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
    panel.innerHTML = this.t(`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>拼音位置<span class="sub">Pinyin Position</span></label>
          <div class="segmented-control" id="s-pypos-group">
            <button data-pos="over" class="seg-btn">上方</button>
            <button data-pos="under" class="seg-btn">下方</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>拼音大小<span class="sub">Pinyin Size</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-pysize-down">−</button>
            <span id="s-pysize-val" class="size-value"></span>
            <button class="size-btn" id="s-pysize-up">+</button>
          </div>
        </div>
      </div>
    `);

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

  private static DICT_LABELS: Record<string, { name: string; desc: string }> = {
    cedict: { name: 'CC-CEDICT', desc: 'English' },
    cvdict: { name: 'CVDICT', desc: 'Vietnamese' },
  };

  private buildDictionariesView(panel: HTMLElement): void {
    this.view = 'dictionaries';
    const s = this.store.get();
    const order = s.dictOrder;

    panel.innerHTML = `
      <div class="sheet-header">
        <button class="sheet-nav-back" id="s-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>

      <div class="sheet-group" id="s-dict-list">
        ${order.map((id, i) => this.buildDictRow(id, i, order.length)).join('')}
      </div>
    `;

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());

    panel.querySelector('#s-back')!.addEventListener('click', () => {
      this.buildMainView(panel);
      this.syncUI(panel);
    });

    this.bindDictListEvents(panel);
  }

  private buildDictRow(id: string, index: number, total: number): string {
    const info = SettingsSheet.DICT_LABELS[id] || { name: id, desc: '' };
    const settingKey = id === 'cedict' ? 'showCedict' : 'showCvdict';
    const checked = this.store.get()[settingKey as keyof Settings] ? 'checked' : '';

    let html = '';
    if (index > 0) html += `<div class="sheet-group-divider"></div>`;
    html += `<div class="sheet-group-row static dict-row" data-dict="${id}">
      <div class="dict-row-reorder">
        <button class="dict-reorder-btn" data-dir="up" ${index === 0 ? 'disabled' : ''} aria-label="Move up">▲</button>
        <button class="dict-reorder-btn" data-dir="down" ${index === total - 1 ? 'disabled' : ''} aria-label="Move down">▼</button>
      </div>
      <div class="dict-row-info">
        <span class="dict-row-name">${info.name}</span>
        <span class="dict-row-desc">${info.desc}</span>
      </div>
      <label class="ios-switch">
        <input type="checkbox" data-dict-toggle="${id}" ${checked} />
        <span class="ios-switch-track"></span>
      </label>
    </div>`;
    return html;
  }

  private bindDictListEvents(panel: HTMLElement): void {
    const list = panel.querySelector('#s-dict-list')!;

    // Toggle events
    list.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      const dictId = input.dataset.dictToggle;
      if (!dictId) return;
      if (dictId === 'cedict') this.store.update({ showCedict: input.checked });
      if (dictId === 'cvdict') this.store.update({ showCvdict: input.checked });
    });

    // Reorder events
    list.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('.dict-reorder-btn') as HTMLElement | null;
      if (!btn) return;
      const row = btn.closest('.dict-row') as HTMLElement;
      const dictId = row.dataset.dict!;
      const dir = btn.dataset.dir as 'up' | 'down';
      const order = [...this.store.get().dictOrder];
      const idx = order.indexOf(dictId as 'cedict' | 'cvdict');
      if (idx === -1) return;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= order.length) return;
      [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
      this.store.update({ dictOrder: order });
      // Rebuild the view to reflect new order
      this.buildDictionariesView(panel);
      this.syncUI(panel);
    });
  }

  openDictionaries(): void {
    if (!this.overlay) {
      this.open();
    }
    const panel = this.overlay?.querySelector<HTMLElement>('.sheet-panel');
    if (panel) {
      this.buildDictionariesView(panel);
      this.syncUI(panel);
    }
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
    } else if (this.view === 'dictionaries') {
      const cedictToggle = panel.querySelector<HTMLInputElement>('[data-dict-toggle="cedict"]');
      if (cedictToggle) cedictToggle.checked = s.showCedict;

      const cvdictToggle = panel.querySelector<HTMLInputElement>('[data-dict-toggle="cvdict"]');
      if (cvdictToggle) cvdictToggle.checked = s.showCvdict;
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
