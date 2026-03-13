import type { TextLoader } from './text-loader.ts';

export class ActionSheet {
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

    // Auto-close on file load
    this.fileInput.addEventListener('change', () => {
      if (this.fileInput.files?.length) this.close();
    });

    document.addEventListener('sheet-opening', (e: Event) => {
      if ((e as CustomEvent).detail !== 'action') this.close();
    });
  }

  open(): void {
    if (this.overlay) return;
    document.dispatchEvent(new CustomEvent('sheet-opening', { detail: 'action' }));

    this.overlay = document.createElement('div');
    this.overlay.className = 'action-sheet-overlay';

    const panel = document.createElement('div');
    panel.className = 'action-sheet-panel';
    panel.innerHTML = `
      <div class="sheet-drag-indicator"></div>
      <button class="action-sheet-item" data-action="builtin">Built-in Texts</button>
      <button class="action-sheet-item" data-action="file">Open File</button>
      <button class="action-sheet-item" data-action="paste">Paste Text</button>
      <div class="action-sheet-builtin-list" style="display:none"></div>
    `;

    this.overlay.appendChild(panel);
    document.body.appendChild(this.overlay);

    // Force reflow then animate
    panel.getBoundingClientRect();
    requestAnimationFrame(() => this.overlay?.classList.add('open'));

    // Overlay tap to close
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });

    panel.querySelector('[data-action="builtin"]')!.addEventListener('click', () => {
      this.showBuiltInList(panel);
    });

    panel.querySelector('[data-action="file"]')!.addEventListener('click', () => {
      this.fileInput.click();
    });

    panel.querySelector('[data-action="paste"]')!.addEventListener('click', () => {
      this.close();
      this.showPasteModal();
    });
  }

  private async showBuiltInList(panel: HTMLElement): Promise<void> {
    const listEl = panel.querySelector<HTMLElement>('.action-sheet-builtin-list')!;

    if (listEl.style.display === 'none') {
      const manifest = await this.textLoader.loadManifest();
      listEl.innerHTML = manifest
        .map((e) => `<button class="action-sheet-builtin-item" data-id="${e.id}">${e.title}</button>`)
        .join('');
      listEl.style.display = '';

      listEl.addEventListener('click', (e) => {
        const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-id]');
        if (btn) {
          this.textLoader.loadBuiltIn(btn.dataset.id!);
          this.close();
        }
      });
    } else {
      listEl.style.display = 'none';
    }
  }

  private showPasteModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Paste Chinese Text</h3>
        <textarea id="paste-area" rows="12" placeholder="Paste your text here..."></textarea>
        <div class="modal-actions">
          <button class="sheet-btn" id="modal-cancel">Cancel</button>
          <button class="sheet-btn primary" id="modal-load">Load</button>
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
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#modal-load')!.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text) this.textLoader.loadFromPaste(text);
      close();
    });
  }

  close(): void {
    if (!this.overlay) return;
    const overlay = this.overlay;
    overlay.classList.remove('open');
    overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    // Fallback if no transition fires
    setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 350);
    this.overlay = null;
    document.dispatchEvent(new CustomEvent('sheet-closed'));
  }
}
