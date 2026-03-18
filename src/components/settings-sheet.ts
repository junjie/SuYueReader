import type { SettingsStore } from '../state/settings.ts';
import type { Settings, WritingMode, PinyinPosition, ThemeMode } from '../types/index.ts';
import { displayFonts, getAvailableSystemFonts, previewFontName, loadFontPreview } from '../services/fonts.ts';
import { convertScriptSync, uiVariant } from '../services/script-convert.ts';
import { ttsGetVoices, ttsIsSupported, ttsPreview } from '../services/tts.ts';

type TabName = 'appearance' | 'typography' | 'dictionaries' | 'tts';

const TAB_KEYS: Record<TabName, (keyof Settings)[]> = {
  appearance: ['theme', 'fontSize', 'writingMode', 'showPinyin', 'pinyinPosition', 'pinyinSize', 'fontFamily', 'fileInfoShown'],
  typography: ['boldText', 'lineHeight', 'lineLength', 'paragraphSpacing', 'verticalParagraphSpacing', 'hangingIndent', 'marginV', 'verticalMarginV', 'showNumbering'],
  dictionaries: ['showCedict', 'showCvdict', 'showMoedict', 'dictOrder', 'popupFontSize'],
  tts: ['ttsVoice', 'ttsRate'],
};

export class SettingsSheet {
  private overlay: HTMLElement | null = null;
  private store: SettingsStore;
  private activeTab: TabName = 'appearance';

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

    this.overlay = document.createElement('div');
    this.overlay.className = 'sheet-overlay';

    const panel = document.createElement('div');
    panel.className = 'sheet-panel';
    this.positionPanel(panel);
    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);

    this.buildTabs(panel);
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
        panel.style.right = `${window.innerWidth - rect.left + margin}px`;
        panel.style.top = `${margin}px`;
        panel.style.maxHeight = `${window.innerHeight - margin * 2}px`;
      } else {
        panel.style.top = `${rect.bottom + margin}px`;
        panel.style.right = `${window.innerWidth - rect.right}px`;
        panel.style.maxHeight = `${window.innerHeight - rect.bottom - margin * 2}px`;
      }
    }
  }

  private buildTabs(panel: HTMLElement): void {
    panel.innerHTML = this.t(`
      <div class="sheet-header" style="justify-content: flex-end">
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>
      <div class="settings-tabs" id="s-tabs">
        <button class="settings-tab" data-tab="appearance">外观<span class="settings-tab-sub">Look</span></button>
        <button class="settings-tab" data-tab="typography">排版<span class="settings-tab-sub">Type</span></button>
        <button class="settings-tab" data-tab="dictionaries">词典<span class="settings-tab-sub">Dict</span></button>
        <button class="settings-tab" data-tab="tts">朗读<span class="settings-tab-sub">Read</span></button>
      </div>
      <div class="settings-tab-content" id="tab-appearance"></div>
      <div class="settings-tab-content hidden" id="tab-typography"></div>
      <div class="settings-tab-content hidden" id="tab-dictionaries"></div>
      <div class="settings-tab-content hidden" id="tab-tts"></div>
    `);

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());

    // Tab switching
    panel.querySelector('#s-tabs')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('.settings-tab');
      if (btn && btn.dataset.tab) {
        this.switchTab(panel, btn.dataset.tab as typeof this.activeTab);
      }
    });

    // Build all tabs
    this.buildAppearanceTab(panel.querySelector('#tab-appearance')!);
    this.buildTypographyTab(panel.querySelector('#tab-typography')!);
    this.buildDictionariesTab(panel.querySelector('#tab-dictionaries')!);
    this.buildTTSTab(panel.querySelector('#tab-tts')!);

    // Activate initial tab
    this.switchTab(panel, this.activeTab);
  }

  private switchTab(panel: HTMLElement, tab: typeof this.activeTab): void {
    this.activeTab = tab;
    panel.querySelectorAll('.settings-tab').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab);
    });
    panel.querySelectorAll('.settings-tab-content').forEach((el) => {
      el.classList.toggle('hidden', el.id !== `tab-${tab}`);
    });
  }

  private buildAppearanceTab(container: HTMLElement): void {
    container.innerHTML = this.t(`
      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>主题<span class="sub">Theme</span></label>
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
          <label>字号<span class="sub">Font Size</span></label>
          <div class="font-size-controls">
            <button class="size-btn" id="s-fontsize-down">小</button>
            <span id="s-fontsize-val" class="size-value"></span>
            <button class="size-btn size-btn-large" id="s-fontsize-up">大</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>方向<span class="sub">Direction</span></label>
          <div class="segmented-control" id="s-mode-group">
            <button data-mode="horizontal" class="seg-btn">横排<span class="seg-sub">Horizontal</span></button>
            <button data-mode="vertical" class="seg-btn">竖排<span class="seg-sub">Vertical</span></button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static toggle-row">
          <label>拼音<span class="sub">Pinyin</span></label>
          <label class="ios-switch">
            <input type="checkbox" id="s-pinyin" />
            <span class="ios-switch-track"></span>
          </label>
        </div>
      </div>

      <div id="s-pinyin-extras" class="sheet-group" style="display:none">
        <div class="sheet-group-row static">
          <label>拼音位置<span class="sub">Position</span></label>
          <div class="segmented-control" id="s-pypos-group">
            <button data-pos="over" class="seg-btn">上方</button>
            <button data-pos="under" class="seg-btn">下方</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>拼音大小<span class="sub">Size</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-pysize-down">−</button>
            <span id="s-pysize-val" class="size-value"></span>
            <button class="size-btn" id="s-pysize-up">+</button>
          </div>
        </div>
      </div>

      <div class="font-scroll-wrapper">
        <button class="font-scroll-arrow font-scroll-left" aria-label="Scroll left">‹</button>
        <div class="font-scroll-row" id="s-font-list">
          ${displayFonts.map((f) => `<button class="font-card" data-font="${f}"><span class="font-card-preview" style="font-family:'${previewFontName(f)}',serif">文字</span><span class="font-card-name">${f}</span></button>`).join('')}
        </div>
        <button class="font-scroll-arrow font-scroll-right" aria-label="Scroll right">›</button>
      </div>
      ${this.resetLinkHTML()}
    `);

    // Force reflow for font row layout
    container.offsetHeight;

    // Theme
    container.querySelector('#s-theme-group')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-theme]');
      if (btn) this.store.update({ theme: btn.dataset.theme as ThemeMode });
    });

    // Font selection (web + system fonts on same row)
    const fontList = container.querySelector('#s-font-list')!;
    const available = getAvailableSystemFonts();
    if (available.length > 0) {
      fontList.insertAdjacentHTML('beforeend',
        available.map((sf) => `<button class="font-card" data-font="${sf.display}"><span class="font-card-preview" style="font-family:'${sf.sc}','${sf.tc}',${sf.family}">文字</span><span class="font-card-name">${sf.display}</span></button>`).join(''));
    }
    fontList.addEventListener('click', (e: Event) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-font]');
      if (btn) this.store.update({ fontFamily: btn.dataset.font! });
    });

    // Scroll arrows (desktop only)
    this.setupFontScrollArrows(container, fontList as HTMLElement);

    // Load font previews
    displayFonts.forEach((f) => loadFontPreview(f));

    // Font size
    container.querySelector('#s-fontsize-down')!.addEventListener('click', () => {
      const s = this.store.get();
      this.store.update({ fontSize: Math.max(14, s.fontSize - 2) });
    });
    container.querySelector('#s-fontsize-up')!.addEventListener('click', () => {
      const s = this.store.get();
      this.store.update({ fontSize: Math.min(48, s.fontSize + 2) });
    });

    // Writing mode
    container.querySelector('#s-mode-group')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-mode]');
      if (btn) this.store.update({ writingMode: btn.dataset.mode as WritingMode });
    });

    // Pinyin toggle
    container.querySelector<HTMLInputElement>('#s-pinyin')!.addEventListener('change', (e) => {
      this.store.update({ showPinyin: (e.target as HTMLInputElement).checked });
    });

    // Pinyin position
    container.querySelector('#s-pypos-group')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-pos]');
      if (btn) this.store.update({ pinyinPosition: btn.dataset.pos as PinyinPosition });
    });

    // Pinyin size
    this.bindStepper(container, 's-pysize', 8, 20, 1, 'pinyinSize');

    this.bindResetLink(container, 'appearance');
  }

  private setupFontScrollArrows(container: HTMLElement, row: HTMLElement): void {
    const leftBtn = container.querySelector<HTMLElement>('.font-scroll-left')!;
    const rightBtn = container.querySelector<HTMLElement>('.font-scroll-right')!;

    const updateArrows = () => {
      const atStart = row.scrollLeft <= 0;
      const atEnd = row.scrollLeft + row.clientWidth >= row.scrollWidth - 1;
      leftBtn.classList.toggle('hidden', atStart);
      rightBtn.classList.toggle('hidden', atEnd);
    };

    row.addEventListener('scroll', updateArrows, { passive: true });
    // Initial state after layout
    requestAnimationFrame(updateArrows);

    const scrollBy = (dir: number) => {
      // Scroll by roughly the visible width minus one card for context
      const amount = row.clientWidth - 40;
      row.scrollBy({ left: dir * amount, behavior: 'smooth' });
    };

    leftBtn.addEventListener('click', () => scrollBy(-1));
    rightBtn.addEventListener('click', () => scrollBy(1));
  }

  private buildTypographyTab(container: HTMLElement): void {
    container.innerHTML = this.t(`
      <div class="sheet-group">
        <div class="sheet-group-row static toggle-row">
          <label>粗体<span class="sub">Bold Text</span></label>
          <label class="ios-switch">
            <input type="checkbox" id="s-boldtext" />
            <span class="ios-switch-track"></span>
          </label>
        </div>
        <div class="sheet-group-divider"></div>
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
          <label>行宽<span class="sub">Line Length</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-linelen-down">−</button>
            <span id="s-linelen-val" class="size-value"></span>
            <button class="size-btn" id="s-linelen-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>段间距<span class="sub">Paragraph Spacing</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-paraspacing-down">−</button>
            <span id="s-paraspacing-val" class="size-value"></span>
            <button class="size-btn" id="s-paraspacing-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>悬挂缩排<span class="sub">Hanging Indent</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-hanging-down">−</button>
            <span id="s-hanging-val" class="size-value"></span>
            <button class="size-btn" id="s-hanging-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>垂直边距<span class="sub">Vertical Margin</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-marginv-down">−</button>
            <span id="s-marginv-val" class="size-value"></span>
            <button class="size-btn" id="s-marginv-up">+</button>
          </div>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static toggle-row">
          <label>段落编号<span class="sub">Paragraph Numbers</span></label>
          <label class="ios-switch">
            <input type="checkbox" id="s-numbering" />
            <span class="ios-switch-track"></span>
          </label>
        </div>
      </div>
      ${this.resetLinkHTML()}
    `);

    const isVertical = this.store.get().writingMode === 'vertical';
    this.bindStepper(container, 's-lineheight', 1.2, 3.5, 0.1, 'lineHeight');
    this.bindStepper(container, 's-linelen', 20, 60, 5, 'lineLength');
    this.bindStepper(container, 's-paraspacing', 0, 4, 0.25, isVertical ? 'verticalParagraphSpacing' : 'paragraphSpacing');
    this.bindStepper(container, 's-hanging', 0, 5, 1, 'hangingIndent');
    this.bindStepper(container, 's-marginv', 0, 100, 4, isVertical ? 'verticalMarginV' : 'marginV');

    container.querySelector<HTMLInputElement>('#s-numbering')!.addEventListener('change', (e) => {
      this.store.update({ showNumbering: (e.target as HTMLInputElement).checked });
    });

    container.querySelector<HTMLInputElement>('#s-boldtext')!.addEventListener('change', (e) => {
      this.store.update({ boldText: (e.target as HTMLInputElement).checked });
    });

    this.bindResetLink(container, 'typography');
  }

  private static DICT_LABELS: Record<string, { name: string; desc: string; license: string; licenseUrl: string; attribution: string; url: string }> = {
    cedict: {
      name: 'CC-CEDICT',
      desc: 'English',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution: 'CC-CEDICT by MDBG',
      url: 'https://cc-cedict.org/wiki/',
    },
    cvdict: {
      name: 'CVDICT',
      desc: 'Vietnamese',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      attribution: 'CVDICT by Phong Phan, based on CC-CEDICT',
      url: 'https://github.com/ph0ngp/CVDICT',
    },
    moedict: {
      name: '国语辞典',
      desc: 'Chinese (Traditional)',
      license: 'CC BY-ND 3.0 TW',
      licenseUrl: 'https://creativecommons.org/licenses/by-nd/3.0/tw/',
      attribution: '教育部《重编国语辞典修订本》',
      url: 'https://dict.revised.moe.edu.tw/',
    },
  };

  private buildDictionariesTab(container: HTMLElement): void {
    const s = this.store.get();
    const order = s.dictOrder;

    container.innerHTML = this.t(`
      <div class="sheet-group" id="s-dict-list">
        ${order.map((id, i) => this.buildDictRow(id, i, order.length)).join('')}
      </div>

      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>字号<span class="sub">Text Size</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-popupsize-down">−</button>
            <span id="s-popupsize-val" class="size-value"></span>
            <button class="size-btn" id="s-popupsize-up">+</button>
          </div>
        </div>
      </div>

      ${this.resetLinkHTML()}
    `);

    this.bindStepper(container, 's-popupsize', 10, 24, 1, 'popupFontSize');
    this.bindDictListEvents(container);

    this.bindResetLink(container, 'dictionaries');
  }

  private buildDictRow(id: string, index: number, total: number): string {
    const info = SettingsSheet.DICT_LABELS[id] || { name: id, desc: '' };
    const settingKeyMap: Record<string, keyof Settings> = { cedict: 'showCedict', cvdict: 'showCvdict', moedict: 'showMoedict' };
    const settingKey = settingKeyMap[id] || 'showCedict';
    const checked = this.store.get()[settingKey] ? 'checked' : '';

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
      <button class="dict-info-btn" data-dict-info="${id}" aria-label="License info">ⓘ</button>
      <label class="ios-switch">
        <input type="checkbox" data-dict-toggle="${id}" ${checked} />
        <span class="ios-switch-track"></span>
      </label>
    </div>`;
    return html;
  }

  private bindDictListEvents(container: HTMLElement): void {
    const list = container.querySelector('#s-dict-list')!;

    // Toggle events
    list.addEventListener('change', (e) => {
      const input = e.target as HTMLInputElement;
      const dictId = input.dataset.dictToggle;
      if (!dictId) return;
      const toggleMap: Record<string, string> = { cedict: 'showCedict', cvdict: 'showCvdict', moedict: 'showMoedict' };
      const key = toggleMap[dictId];
      if (key) this.store.update({ [key]: input.checked });
    });

    // Reorder and info events
    list.addEventListener('click', (e) => {
      const infoBtn = (e.target as HTMLElement).closest('.dict-info-btn') as HTMLElement | null;
      if (infoBtn) {
        const dictId = infoBtn.dataset.dictInfo!;
        this.showLicenseModal(dictId);
        return;
      }
      const btn = (e.target as HTMLElement).closest('.dict-reorder-btn') as HTMLElement | null;
      if (!btn) return;
      const row = btn.closest('.dict-row') as HTMLElement;
      const dictId = row.dataset.dict!;
      const dir = btn.dataset.dir as 'up' | 'down';
      const order = [...this.store.get().dictOrder];
      const idx = order.indexOf(dictId as 'cedict' | 'cvdict' | 'moedict');
      if (idx === -1) return;
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= order.length) return;
      [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
      this.store.update({ dictOrder: order });
      // Rebuild only the dict list
      const newOrder = this.store.get().dictOrder;
      list.innerHTML = this.t(newOrder.map((id, i) => this.buildDictRow(id, i, newOrder.length)).join(''));
    });
  }

  private showLicenseModal(dictId: string): void {
    const info = SettingsSheet.DICT_LABELS[dictId];
    if (!info) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal" style="width: min(90vw, 400px);">
        <h3>${info.name}</h3>
        <div class="license-modal-body">
          <p>License: <a href="${info.licenseUrl}" target="_blank" rel="noopener noreferrer">${info.license}</a></p>
          <p>${info.attribution}<br><a href="${info.url}" target="_blank" rel="noopener noreferrer">${info.url}</a></p>
        </div>
        <div class="modal-actions">
          <button class="sheet-action-btn" id="license-modal-close">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('#license-modal-close')!.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.addEventListener('touchstart', (e) => {
      if (e.target === overlay) {
        e.preventDefault();
        close();
      }
    }, { passive: false });
  }

  private buildTTSTab(container: HTMLElement): void {
    const supported = ttsIsSupported();
    if (!supported) {
      container.innerHTML = this.t(`
        <div class="sheet-group">
          <div class="sheet-group-row static">
            <label style="color:var(--fg-muted)">此浏览器不支持语音合成</label>
          </div>
        </div>
      `);
      return;
    }

    container.innerHTML = this.t(`
      <div class="sheet-group">
        <div class="sheet-group-row static">
          <label>语音<span class="sub">Voice</span></label>
          <select id="s-tts-voice" class="inline-select"></select>
        </div>
        <div class="sheet-group-divider"></div>
        <div class="sheet-group-row static">
          <label>语速<span class="sub">Speed</span></label>
          <div class="stepper-controls">
            <button class="size-btn" id="s-ttsrate-down">−</button>
            <span id="s-ttsrate-val" class="size-value"></span>
            <button class="size-btn" id="s-ttsrate-up">+</button>
          </div>
        </div>
      </div>
      ${this.resetLinkHTML()}
    `);

    this.bindStepper(container, 's-ttsrate', 0.5, 2.0, 0.1, 'ttsRate');

    const select = container.querySelector<HTMLSelectElement>('#s-tts-voice')!;
    const populateVoices = () => {
      const voices = ttsGetVoices();
      const current = this.store.get().ttsVoice;
      select.innerHTML = `<option value="">默认 Default</option>`
        + voices.map((v) => `<option value="${v.name}"${v.name === current ? ' selected' : ''}>${v.name} (${v.lang})</option>`).join('');
    };
    populateVoices();
    speechSynthesis.addEventListener('voiceschanged', populateVoices);

    select.addEventListener('change', () => {
      this.store.update({ ttsVoice: select.value });
      ttsPreview(select.value);
    });

    this.bindResetLink(container, 'tts');
  }

  openDictionaries(): void {
    if (!this.overlay) {
      this.activeTab = 'dictionaries';
      this.open();
      return;
    }
    const panel = this.overlay.querySelector<HTMLElement>('.sheet-panel');
    if (panel) {
      this.switchTab(panel, 'dictionaries');
    }
  }

  private resetLinkHTML(): string {
    return '<div class="reset-link-row hidden"><a href="#" class="reset-link">↺ 恢复预设 Reset to Defaults</a></div>';
  }

  private isTabDefault(tab: TabName): boolean {
    return this.store.isDefaultKeys(TAB_KEYS[tab]);
  }

  private bindResetLink(container: HTMLElement, tab: TabName): void {
    const row = container.querySelector('.reset-link-row');
    if (row) row.classList.toggle('hidden', this.isTabDefault(tab));
    const link = container.querySelector('.reset-link');
    if (!link) return;
    link.addEventListener('click', (e) => {
      e.preventDefault();
      this.showResetConfirmModal(tab);
    });
  }

  private static TAB_LABELS: Record<TabName, { zh: string; en: string }> = {
    appearance: { zh: '外观', en: 'Look' },
    typography: { zh: '排版', en: 'Type' },
    dictionaries: { zh: '词典', en: 'Dict' },
    tts: { zh: '朗读', en: 'Read' },
  };

  private showResetConfirmModal(tab: TabName): void {
    const { zh, en } = SettingsSheet.TAB_LABELS[tab];
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = this.t(`
      <div class="modal" style="width: min(90vw, 400px);">
        <div style="display:flex;flex-direction:column;gap:2px">
          <h3 style="margin:0">恢复「${zh}」预设？</h3>
          <p style="font-size:12px;color:var(--fg-muted);margin:0">Reset to default settings for ${en}?</p>
        </div>
        <div class="modal-actions">
          <button class="sheet-action-btn modal-btn-bilingual" id="reset-modal-cancel">取消<span class="modal-btn-sub">Cancel</span></button>
          <button class="sheet-action-btn danger modal-btn-bilingual" id="reset-modal-tab">重置${zh}<span class="modal-btn-sub">Reset ${en}</span></button>
        </div>
        <div style="text-align:right"><a href="#" id="reset-modal-all" class="reset-link" style="color:#d33">↺ 全部重置 Reset All</a></div>
      </div>
    `);
    document.body.appendChild(overlay);

    const close = () => overlay.remove();

    overlay.querySelector('#reset-modal-cancel')!.addEventListener('click', close);
    overlay.querySelector('#reset-modal-tab')!.addEventListener('click', () => {
      close();
      this.store.resetKeys(TAB_KEYS[tab]);
      const panel = this.overlay?.querySelector<HTMLElement>('.sheet-panel');
      if (panel) {
        this.buildTabs(panel);
        this.syncUI(panel);
      }
    });
    overlay.querySelector('#reset-modal-all')!.addEventListener('click', (e) => {
      e.preventDefault();
      close();
      this.store.reset();
      const panel = this.overlay?.querySelector<HTMLElement>('.sheet-panel');
      if (panel) {
        this.buildTabs(panel);
        this.syncUI(panel);
      }
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.addEventListener('touchstart', (e) => {
      if (e.target === overlay) {
        e.preventDefault();
        close();
      }
    }, { passive: false });
  }

  private bindStepper(container: HTMLElement, id: string, min: number, max: number, step: number, key: keyof Settings): void {
    container.querySelector(`#${id}-down`)!.addEventListener('click', () => {
      const cur = this.store.get()[key] as number;
      this.store.update({ [key]: Math.max(min, Math.round((cur - step) * 100) / 100) });
    });
    container.querySelector(`#${id}-up`)!.addEventListener('click', () => {
      const cur = this.store.get()[key] as number;
      this.store.update({ [key]: Math.min(max, Math.round((cur + step) * 100) / 100) });
    });
  }

  private syncUI(panel: HTMLElement): void {
    const s: Settings = this.store.get();
    const isVertical = s.writingMode === 'vertical';

    // Appearance tab
    const fsVal = panel.querySelector('#s-fontsize-val');
    if (fsVal) fsVal.textContent = `${s.fontSize}px`;

    panel.querySelectorAll('#s-theme-group .theme-swatch').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.theme === s.theme);
    });

    panel.querySelectorAll('.font-card[data-font]').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.font === s.fontFamily);
    });

    panel.querySelectorAll('#s-mode-group .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.mode === s.writingMode);
    });

    const pyCheck = panel.querySelector<HTMLInputElement>('#s-pinyin');
    if (pyCheck) pyCheck.checked = s.showPinyin;

    const pyExtras = panel.querySelector<HTMLElement>('#s-pinyin-extras');
    if (pyExtras) pyExtras.style.display = s.showPinyin ? '' : 'none';

    panel.querySelectorAll('#s-pypos-group .seg-btn').forEach((btn) => {
      btn.classList.toggle('active', (btn as HTMLElement).dataset.pos === s.pinyinPosition);
    });

    this.setStepperVal(panel, 's-pysize', `${s.pinyinSize}px`);

    // Typography tab
    this.setStepperVal(panel, 's-lineheight', `${s.lineHeight}`);
    this.setStepperVal(panel, 's-linelen', `${s.lineLength}字`);
    this.setStepperVal(panel, 's-paraspacing', `${isVertical ? s.verticalParagraphSpacing : s.paragraphSpacing}em`);
    this.setStepperVal(panel, 's-hanging', `${s.hangingIndent}字`);
    this.setStepperVal(panel, 's-marginv', `${isVertical ? s.verticalMarginV : s.marginV}px`);

    const numCheck = panel.querySelector<HTMLInputElement>('#s-numbering');
    if (numCheck) numCheck.checked = s.showNumbering;

    const boldCheck = panel.querySelector<HTMLInputElement>('#s-boldtext');
    if (boldCheck) boldCheck.checked = s.boldText;

    // Dictionaries tab
    const toggleMap: Record<string, keyof Settings> = { cedict: 'showCedict', cvdict: 'showCvdict', moedict: 'showMoedict' };
    for (const [dictId, key] of Object.entries(toggleMap)) {
      const toggle = panel.querySelector<HTMLInputElement>(`[data-dict-toggle="${dictId}"]`);
      if (toggle) toggle.checked = s[key] as boolean;
    }
    this.setStepperVal(panel, 's-popupsize', `${s.popupFontSize}px`);

    // TTS tab
    this.setStepperVal(panel, 's-ttsrate', `${s.ttsRate}x`);
    const voiceSelect = panel.querySelector<HTMLSelectElement>('#s-tts-voice');
    if (voiceSelect) voiceSelect.value = s.ttsVoice;

    // Show/hide reset links per tab
    const tabs: TabName[] = ['appearance', 'typography', 'dictionaries', 'tts'];
    for (const tab of tabs) {
      const tabEl = panel.querySelector(`#tab-${tab}`);
      const row = tabEl?.querySelector('.reset-link-row');
      if (row) row.classList.toggle('hidden', this.isTabDefault(tab));
    }
  }

  private setStepperVal(panel: HTMLElement, id: string, display: string): void {
    const valSpan = panel.querySelector(`#${id}-val`);
    if (valSpan) valSpan.textContent = display;
  }
}
