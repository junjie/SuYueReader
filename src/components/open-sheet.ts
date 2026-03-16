import type { TextLoader } from './text-loader.ts';
import type { SettingsStore } from '../state/settings.ts';
import { convertScriptSync, uiVariant } from '../services/script-convert.ts';

export class OpenSheet {
  private overlay: HTMLElement | null = null;
  private textLoader: TextLoader;
  private fileInput: HTMLInputElement;
  private store: SettingsStore;

  constructor(textLoader: TextLoader, store: SettingsStore) {
    this.textLoader = textLoader;
    this.store = store;

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.txt,.text,.sy';
    this.fileInput.hidden = true;
    document.body.appendChild(this.fileInput);
    this.textLoader.setupFileInput(this.fileInput);

    this.fileInput.addEventListener('change', () => {
      if (this.fileInput.files?.length) this.close();
    });
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
    document.dispatchEvent(new CustomEvent('sheet-opening', { detail: 'open' }));

    this.overlay = document.createElement('div');
    this.overlay.className = 'sheet-overlay';

    const panel = document.createElement('div');
    panel.className = 'sheet-panel';
    this.positionPanel(panel);
    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);

    this.buildMainView(panel);

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
  }

  close(): void {
    if (!this.overlay) return;
    const overlay = this.overlay;
    overlay.classList.remove('open');
    const panel = overlay.querySelector('.sheet-panel');
    if (panel) {
      panel.addEventListener('transitionend', () => overlay.remove(), { once: true });
    }
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 250);
    this.overlay = null;
    document.dispatchEvent(new CustomEvent('sheet-closed'));
  }

  private buildMainView(panel: HTMLElement): void {
    panel.innerHTML = this.t(`
      <div class="sheet-header">
        <span class="sheet-nav-back" style="visibility:hidden">‹</span>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>
      <div class="sheet-group">
        <button class="sheet-group-row" data-action="builtin">
          <span>從文庫選擇<span class="row-sub">Choose from Library</span></span>
          <span class="row-chevron">›</span>
        </button>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" data-action="file">
          <span>開啟檔案<span class="row-sub">Open File</span></span>
          <span class="row-chevron">›</span>
        </button>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" data-action="paste">
          <span>貼上文本<span class="row-sub">Paste Text</span></span>
          <span class="row-chevron">›</span>
        </button>
      </div>
      <div class="open-sheet-footer">素閱 ${__BUILD_DATE__}<br><a href="https://mastodon.social/@junjielin" target="_blank" rel="noopener noreferrer">林雋傑</a></div>
    `);

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());
    panel.querySelector('[data-action="builtin"]')!.addEventListener('click', () => {
      this.buildLibraryView(panel);
    });
    panel.querySelector('[data-action="file"]')!.addEventListener('click', () => {
      this.close();
      this.fileInput.click();
    });
    panel.querySelector('[data-action="paste"]')!.addEventListener('click', () => {
      this.close();
      this.showPasteModal();
    });
  }

  private async buildLibraryView(panel: HTMLElement): Promise<void> {
    panel.innerHTML = this.t(`
      <div class="sheet-header">
        <button class="sheet-nav-back" id="lib-back">‹</button>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>
      <div class="sheet-group" id="lib-list">
        <div class="sheet-group-row static" style="justify-content:center;color:var(--fg-muted)">載入中…</div>
      </div>
    `);

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());
    panel.querySelector('#lib-back')!.addEventListener('click', () => {
      this.buildMainView(panel);
    });

    const manifest = await this.textLoader.loadManifest();
    const listEl = panel.querySelector('#lib-list')!;
    listEl.innerHTML = manifest.map((e, i) =>
      `${i > 0 ? '<div class="sheet-group-divider"></div>' : ''}<button class="sheet-group-row" data-id="${e.id}"><span>${this.t(e.title)}</span></button>`
    ).join('');

    listEl.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
      if (btn) {
        this.textLoader.loadBuiltIn(btn.dataset.id!);
        this.close();
      }
    });
  }

  private positionPanel(panel: HTMLElement): void {
    const btn = document.getElementById('navbar-open');
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
        // Place below navbar, left edge aligned with button's left edge
        panel.style.top = `${rect.bottom + margin}px`;
        panel.style.left = `${rect.left}px`;
        panel.style.maxHeight = `${window.innerHeight - rect.bottom - margin * 2}px`;
      }
    }
  }

  private showPasteModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = this.t(`
      <div class="modal">
        <h3>貼上文本<span class="row-sub" style="display:inline; margin-left:6px">Paste Text</span></h3>
        <textarea id="paste-area" rows="12" placeholder="在此貼上文本（所有內容僅在裝置上處理，不會傳輸或儲存至任何伺服器）&#10;&#10;Paste text here (everything is processed on your device — nothing is transmitted or stored)"></textarea>
        <div class="modal-actions">
          <button class="sheet-action-btn" id="modal-cancel">取消</button>
          <button class="sheet-action-btn primary" id="modal-load">載入</button>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);

    const textarea = overlay.querySelector<HTMLTextAreaElement>('#paste-area')!;
    textarea.focus();

    const close = () => {
      overlay.remove();
      document.dispatchEvent(new CustomEvent('sheet-closed'));
    };

    overlay.querySelector('#modal-cancel')!.addEventListener('click', close);
    overlay.addEventListener('touchstart', (e) => {
      if (e.target === overlay) {
        e.preventDefault();
        close();
      }
    }, { passive: false });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    overlay.querySelector('#modal-load')!.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text) this.textLoader.loadFromPaste(text);
      close();
    });
  }
}
