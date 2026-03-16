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
    this.fileInput.accept = '.txt,.text,.sy,.docx,.pdf';
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
          <span>从文库选择<span class="row-sub">Choose from Library</span></span>
          <span class="row-chevron">›</span>
        </button>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" data-action="file">
          <span>开启档案<span class="row-sub">Open File</span></span>
          <span class="row-chevron">›</span>
        </button>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" data-action="paste">
          <span>贴上文本<span class="row-sub">Paste Text</span></span>
          <span class="row-chevron">›</span>
        </button>
      </div>
      <div class="open-sheet-footer"><a href="https://github.com/junjie/SuYueReader" target="_blank" rel="noopener noreferrer">素阅</a> ${__BUILD_DATE__}<br><a href="https://mastodon.social/@junjielin" target="_blank" rel="noopener noreferrer">林隽杰</a></div>
    `);

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());
    panel.querySelector('[data-action="builtin"]')!.addEventListener('click', () => {
      this.buildLibraryView(panel);
    });
    panel.querySelector('[data-action="file"]')!.addEventListener('click', () => {
      if (!this.store.get().fileInfoShown) {
        this.close();
        this.showFileInfoModal();
      } else {
        this.close();
        this.fileInput.click();
      }
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
        <div class="sheet-group-row static" style="justify-content:center;color:var(--fg-muted)">载入中…</div>
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

  private showFileInfoModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = this.t(`
      <div class="modal">
        <h3>开启档案<span class="row-sub" style="display:inline; margin-left:6px">Open File</span></h3>
        <div class="modal-info-body">
          <p class="modal-info-heading">支持格式 <span class="modal-info-heading-sub">Supported formats</span></p>
          <p class="modal-info-text">纯文本（.txt）与 Word 文档（.docx）效果最佳。PDF 因文字重排问题，可能无法呈现理想的阅读体验。</p>
          <p class="modal-info-text sub">Plain text (.txt) and Word (.docx) documents work best. PDFs may not display ideally due to text reflow limitations.</p>
          <p class="modal-info-heading" style="margin-top:12px">隐私 <span class="modal-info-heading-sub">Privacy</span></p>
          <p class="modal-info-text">所有文件全程在你的设备上处理，不会上传至任何服务器。</p>
          <p class="modal-info-text sub">All files are processed entirely on your device and are never uploaded to any server.</p>
        </div>
        <div class="modal-actions">
          <button class="sheet-action-btn primary modal-btn-bilingual" id="modal-file-ok">开启档案<span class="modal-btn-sub">Open File</span></button>
        </div>
      </div>
    `);
    document.body.appendChild(overlay);

    const close = () => {
      overlay.remove();
      document.dispatchEvent(new CustomEvent('sheet-closed'));
    };

    overlay.querySelector('#modal-file-ok')!.addEventListener('click', () => {
      this.store.update({ fileInfoShown: true });
      close();
      this.fileInput.click();
    });
    overlay.addEventListener('touchstart', (e) => {
      if (e.target === overlay) {
        e.preventDefault();
        close();
      }
    }, { passive: false });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
  }

  private showPasteModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = this.t(`
      <div class="modal">
        <h3>贴上文本<span class="row-sub" style="display:inline; margin-left:6px">Paste Text</span></h3>
        <textarea id="paste-area" rows="12" placeholder="在此贴上文本&#10;Paste text here&#10;&#10;所有内容全程在你的设备上处理，不会传输至任何服务器。&#10;Everything is processed entirely on your device — nothing is ever sent to a server."></textarea>
        <div class="modal-actions">
          <button class="sheet-action-btn modal-btn-bilingual" id="modal-cancel">取消<span class="modal-btn-sub">Cancel</span></button>
          <button class="sheet-action-btn primary modal-btn-bilingual" id="modal-load">载入<span class="modal-btn-sub">Load</span></button>
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
