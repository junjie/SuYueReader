import type { SettingsStore } from '../state/settings.ts';
import type { Settings, WritingMode, PinyinPosition, ThemeMode } from '../types/index.ts';
import { availableFonts, loadFont } from '../services/fonts.ts';
import { defaultSettings } from '../state/defaults.ts';

export class SettingsPanel {
  private el: HTMLElement;
  private store: SettingsStore;

  constructor(el: HTMLElement, store: SettingsStore) {
    this.el = el;
    this.store = store;
    this.build();
    this.syncUI();

    document.addEventListener('settings-changed', () => this.syncUI());
  }

  toggle(): void {
    this.el.classList.toggle('open');
  }

  private build(): void {
    this.el.innerHTML = `
      <div class="settings-header">
        <h2>Settings</h2>
        <button class="settings-close" aria-label="Close">✕</button>
      </div>
      <div class="settings-body">

        <section>
          <label>Font</label>
          <select id="s-font">
            ${availableFonts.map((f) => `<option value="${f}">${f}</option>`).join('')}
          </select>
        </section>

        <section>
          <label>Font Size: <span id="s-fontsize-val"></span></label>
          <input type="range" id="s-fontsize" min="14" max="48" step="1" />
        </section>

        <section>
          <label>Line Height: <span id="s-lineheight-val"></span></label>
          <input type="range" id="s-lineheight" min="1.2" max="3.5" step="0.1" />
        </section>

        <section>
          <label>Paragraph Spacing: <span id="s-paraspacing-val"></span></label>
          <input type="range" id="s-paraspacing" min="0" max="4" step="0.25" />
        </section>

        <section>
          <label>Horizontal Margin: <span id="s-marginh-val"></span></label>
          <input type="range" id="s-marginh" min="0" max="200" step="8" />
        </section>

        <section>
          <label>Vertical Margin: <span id="s-marginv-val"></span></label>
          <input type="range" id="s-marginv" min="0" max="100" step="4" />
        </section>

        <section>
          <label>Layout</label>
          <div class="btn-group">
            <button data-mode="horizontal" id="s-mode-h">Horizontal</button>
            <button data-mode="vertical" id="s-mode-v">Vertical</button>
          </div>
        </section>

        <section>
          <label>Theme</label>
          <div class="btn-group">
            <button data-theme="light" id="s-theme-light">Light</button>
            <button data-theme="dark" id="s-theme-dark">Dark</button>
          </div>
        </section>

        <section>
          <label>
            <input type="checkbox" id="s-pinyin" />
            Show Pinyin
          </label>
        </section>

        <section id="pinyin-options">
          <label>Pinyin Position</label>
          <div class="btn-group">
            <button data-pos="over" id="s-py-over">Above</button>
            <button data-pos="under" id="s-py-under">Below</button>
          </div>
          <label>Pinyin Size: <span id="s-pysize-val"></span></label>
          <input type="range" id="s-pysize" min="8" max="20" step="1" />
        </section>

        <section>
          <label>
            <input type="checkbox" id="s-numbering" />
            Show Paragraph Numbers
          </label>
        </section>

        <section>
          <button class="toolbar-btn" id="s-reset">Reset to Defaults</button>
        </section>
      </div>
    `;

    this.el.querySelector('.settings-close')!.addEventListener('click', () => this.toggle());

    // Font
    this.el.querySelector<HTMLSelectElement>('#s-font')!.addEventListener('change', (e) => {
      const font = (e.target as HTMLSelectElement).value;
      loadFont(font);
      this.store.update({ fontFamily: font });
    });

    // Sliders
    this.bindSlider('s-fontsize', (v) => this.store.update({ fontSize: Number(v) }));
    this.bindSlider('s-lineheight', (v) => this.store.update({ lineHeight: Number(v) }));
    this.bindSlider('s-paraspacing', (v) => this.store.update({ paragraphSpacing: Number(v) }));
    this.bindSlider('s-marginh', (v) => this.store.update({ marginH: Number(v) }));
    this.bindSlider('s-marginv', (v) => this.store.update({ marginV: Number(v) }));
    this.bindSlider('s-pysize', (v) => this.store.update({ pinyinSize: Number(v) }));

    // Writing mode
    this.el.querySelector('#s-mode-h')!.addEventListener('click', () =>
      this.store.update({ writingMode: 'horizontal' as WritingMode })
    );
    this.el.querySelector('#s-mode-v')!.addEventListener('click', () =>
      this.store.update({ writingMode: 'vertical' as WritingMode })
    );

    // Theme
    this.el.querySelector('#s-theme-light')!.addEventListener('click', () =>
      this.store.update({ theme: 'light' as ThemeMode })
    );
    this.el.querySelector('#s-theme-dark')!.addEventListener('click', () =>
      this.store.update({ theme: 'dark' as ThemeMode })
    );

    // Pinyin toggle
    this.el.querySelector<HTMLInputElement>('#s-pinyin')!.addEventListener('change', (e) => {
      this.store.update({ showPinyin: (e.target as HTMLInputElement).checked });
    });

    // Pinyin position
    this.el.querySelector('#s-py-over')!.addEventListener('click', () =>
      this.store.update({ pinyinPosition: 'over' as PinyinPosition })
    );
    this.el.querySelector('#s-py-under')!.addEventListener('click', () =>
      this.store.update({ pinyinPosition: 'under' as PinyinPosition })
    );

    // Numbering
    this.el.querySelector<HTMLInputElement>('#s-numbering')!.addEventListener('change', (e) => {
      this.store.update({ showNumbering: (e.target as HTMLInputElement).checked });
    });

    // Reset
    this.el.querySelector('#s-reset')!.addEventListener('click', () => {
      this.store.reset();
      // Reload the default font
      loadFont(defaultSettings.fontFamily);
    });
  }

  private bindSlider(id: string, onChange: (value: string) => void): void {
    const slider = this.el.querySelector<HTMLInputElement>(`#${id}`)!;
    slider.addEventListener('input', () => onChange(slider.value));
  }

  private syncUI(): void {
    const s: Settings = this.store.get();

    // Font select
    this.el.querySelector<HTMLSelectElement>('#s-font')!.value = s.fontFamily;

    // Sliders
    this.setSlider('s-fontsize', s.fontSize, `${s.fontSize}px`);
    this.setSlider('s-lineheight', s.lineHeight, `${s.lineHeight}`);
    this.setSlider('s-paraspacing', s.paragraphSpacing, `${s.paragraphSpacing}em`);
    this.setSlider('s-marginh', s.marginH, `${s.marginH}px`);
    this.setSlider('s-marginv', s.marginV, `${s.marginV}px`);
    this.setSlider('s-pysize', s.pinyinSize, `${s.pinyinSize}px`);

    // Mode buttons
    this.setActive('#s-mode-h', s.writingMode === 'horizontal');
    this.setActive('#s-mode-v', s.writingMode === 'vertical');

    // Theme buttons
    this.setActive('#s-theme-light', s.theme === 'light');
    this.setActive('#s-theme-dark', s.theme === 'dark');

    // Checkboxes
    this.el.querySelector<HTMLInputElement>('#s-pinyin')!.checked = s.showPinyin;
    this.el.querySelector<HTMLInputElement>('#s-numbering')!.checked = s.showNumbering;

    // Pinyin options visibility
    const pyOpts = this.el.querySelector<HTMLElement>('#pinyin-options')!;
    pyOpts.style.display = s.showPinyin ? '' : 'none';

    // Pinyin position buttons
    this.setActive('#s-py-over', s.pinyinPosition === 'over');
    this.setActive('#s-py-under', s.pinyinPosition === 'under');
  }

  private setSlider(id: string, value: number, display: string): void {
    const slider = this.el.querySelector<HTMLInputElement>(`#${id}`)!;
    slider.value = String(value);
    const valSpan = this.el.querySelector(`#${id}-val`);
    if (valSpan) valSpan.textContent = display;
  }

  private setActive(selector: string, active: boolean): void {
    this.el.querySelector(selector)!.classList.toggle('active', active);
  }
}
