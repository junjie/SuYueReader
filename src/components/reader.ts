import type { Paragraph } from '../types/index.ts';
import type { SettingsStore } from '../state/settings.ts';
import { annotateWithPinyin } from '../services/pinyin.ts';

export class Reader {
  private container: HTMLElement;
  private store: SettingsStore;
  private paragraphs: Paragraph[] = [];

  constructor(container: HTMLElement, store: SettingsStore) {
    this.container = container;
    this.store = store;

    document.addEventListener('settings-changed', (e) => {
      const detail = (e as CustomEvent).detail;
      if (detail.pinyinChanged) {
        this.render();
      }
      this.updateAttributes();
    });
  }

  setParagraphs(paragraphs: Paragraph[]): void {
    this.paragraphs = paragraphs;
    this.render();
  }

  private updateAttributes(): void {
    const s = this.store.get();
    this.container.setAttribute('data-pinyin-position', s.pinyinPosition);
    this.container.classList.toggle('show-numbering', s.showNumbering);
    this.container.classList.toggle('vertical-mode', s.writingMode === 'vertical');
  }

  async render(): Promise<void> {
    const s = this.store.get();
    this.updateAttributes();

    if (this.paragraphs.length === 0) {
      this.container.innerHTML =
        '<p class="reader-placeholder">Load a text to begin reading.</p>';
      return;
    }

    const fragments: string[] = [];

    for (const para of this.paragraphs) {
      let content: string;
      if (s.showPinyin) {
        content = await annotateWithPinyin(para.text);
      } else {
        content = this.escapeHtml(para.text);
      }
      fragments.push(`<p data-index="${para.index}">${content}</p>`);
    }

    this.container.innerHTML = fragments.join('');
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
