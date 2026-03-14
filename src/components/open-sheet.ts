import type { TextLoader } from './text-loader.ts';

export class OpenSheet {
  private overlay: HTMLElement | null = null;
  private textLoader: TextLoader;
  private fileInput: HTMLInputElement;

  constructor(textLoader: TextLoader) {
    this.textLoader = textLoader;

    this.fileInput = document.createElement('input');
    this.fileInput.type = 'file';
    this.fileInput.accept = '.txt,.text';
    this.fileInput.hidden = true;
    document.body.appendChild(this.fileInput);
    this.textLoader.setupFileInput(this.fileInput);

    this.fileInput.addEventListener('change', () => {
      if (this.fileInput.files?.length) this.close();
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
    document.dispatchEvent(new CustomEvent('sheet-opening', { detail: 'open' }));

    this.overlay = document.createElement('div');
    this.overlay.className = 'sheet-overlay';

    const panel = document.createElement('div');
    panel.className = 'sheet-panel';
    panel.innerHTML = `
      <div class="sheet-header">
        <span class="sheet-nav-back" style="visibility:hidden">‹ Back</span>
        <button class="sheet-close-btn" id="sheet-close" aria-label="Close">✕</button>
      </div>
      <div class="sheet-group">
        <button class="sheet-group-row" data-action="builtin">
          <span>Choose from Library</span>
          <span class="row-chevron">›</span>
        </button>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" data-action="file">
          <span>Upload File</span>
          <span class="row-chevron">›</span>
        </button>
        <div class="sheet-group-divider"></div>
        <button class="sheet-group-row" data-action="paste">
          <span>Paste Text</span>
          <span class="row-chevron">›</span>
        </button>
      </div>
    `;

    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);

    panel.querySelector('#sheet-close')!.addEventListener('click', () => this.close());

    panel.querySelector('[data-action="builtin"]')!.addEventListener('click', () => {
      this.showLibraryPopup();
    });
    panel.querySelector('[data-action="file"]')!.addEventListener('click', () => {
      this.fileInput.click();
    });
    panel.querySelector('[data-action="paste"]')!.addEventListener('click', () => {
      this.close();
      this.showPasteModal();
    });

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
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 350);
    this.overlay = null;
    document.dispatchEvent(new CustomEvent('sheet-closed'));
  }

  private async showLibraryPopup(): Promise<void> {
    const manifest = await this.textLoader.loadManifest();

    const popup = document.createElement('div');
    popup.className = 'popup-overlay';
    popup.innerHTML = `
      <div class="popup-panel">
        <div class="popup-header">
          <span class="popup-title">Library</span>
          <button class="popup-close" aria-label="Close">✕</button>
        </div>
        <div class="popup-list">
          ${manifest.map((e) => `<button class="popup-item" data-id="${e.id}">${e.title}</button>`).join('')}
        </div>
      </div>
    `;
    document.body.appendChild(popup);

    const popupPanel = popup.querySelector<HTMLElement>('.popup-panel')!;
    popupPanel.getBoundingClientRect();
    requestAnimationFrame(() => popup.classList.add('open'));

    const closePopup = () => {
      popup.classList.remove('open');
      popup.addEventListener('transitionend', () => popup.remove(), { once: true });
      setTimeout(() => { if (popup.parentNode) popup.remove(); }, 350);
    };

    popup.querySelector('.popup-close')!.addEventListener('click', closePopup);
    popup.addEventListener('touchstart', (e) => {
      if (e.target === popup) {
        e.preventDefault();
        closePopup();
      }
    }, { passive: false });
    popup.addEventListener('click', (e) => {
      if (e.target === popup) closePopup();
    });

    popup.querySelector('.popup-list')!.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
      if (btn) {
        this.textLoader.loadBuiltIn(btn.dataset.id!);
        closePopup();
        this.close();
      }
    });
  }

  private showPasteModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Paste Chinese Text</h3>
        <textarea id="paste-area" rows="12" placeholder="Paste your text here..."></textarea>
        <div class="modal-actions">
          <button class="sheet-action-btn" id="modal-cancel">Cancel</button>
          <button class="sheet-action-btn primary" id="modal-load">Load</button>
        </div>
      </div>
    `;
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
