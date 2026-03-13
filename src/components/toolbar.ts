import type { TextLoader } from './text-loader.ts';

export class Toolbar {
  private el: HTMLElement;
  private textLoader: TextLoader;
  private onSettingsToggle: () => void;

  constructor(
    el: HTMLElement,
    textLoader: TextLoader,
    onSettingsToggle: () => void
  ) {
    this.el = el;
    this.textLoader = textLoader;
    this.onSettingsToggle = onSettingsToggle;
    this.build();
  }

  private async build() {
    const manifest = await this.textLoader.loadManifest();

    this.el.innerHTML = `
      <div class="toolbar-left">
        <span class="toolbar-title">Chinese Reader</span>
      </div>
      <div class="toolbar-center">
        <div class="toolbar-load-group">
          <select id="builtin-select">
            <option value="">— Load built-in text —</option>
            ${manifest.map((e) => `<option value="${e.id}">${e.title}</option>`).join('')}
          </select>
          <label class="toolbar-btn" id="file-upload-label">
            Open File
            <input type="file" id="file-input" accept=".txt,.text" hidden />
          </label>
          <button class="toolbar-btn" id="paste-btn">Paste</button>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="toolbar-btn" id="settings-toggle" aria-label="Settings">⚙</button>
      </div>
    `;

    const select = this.el.querySelector<HTMLSelectElement>('#builtin-select')!;
    select.addEventListener('change', () => {
      if (select.value) {
        this.textLoader.loadBuiltIn(select.value);
        select.value = '';
      }
    });

    const fileInput = this.el.querySelector<HTMLInputElement>('#file-input')!;
    this.textLoader.setupFileInput(fileInput);

    this.el.querySelector('#paste-btn')!.addEventListener('click', () => {
      this.showPasteModal();
    });

    this.el.querySelector('#settings-toggle')!.addEventListener('click', () => {
      this.onSettingsToggle();
    });
  }

  private showPasteModal() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <h3>Paste Chinese Text</h3>
        <textarea id="paste-area" rows="12" placeholder="Paste your text here..."></textarea>
        <div class="modal-actions">
          <button class="toolbar-btn" id="modal-cancel">Cancel</button>
          <button class="toolbar-btn primary" id="modal-load">Load</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const textarea = overlay.querySelector<HTMLTextAreaElement>('#paste-area')!;
    textarea.focus();

    const close = () => overlay.remove();

    overlay.querySelector('#modal-cancel')!.addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    overlay.querySelector('#modal-load')!.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text) {
        this.textLoader.loadFromPaste(text);
      }
      close();
    });
  }
}
