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
      if (detail.writingModeChanged) {
        const progress = this.getReadingProgress(detail.prevWritingMode);
        this.updateAttributes();
        requestAnimationFrame(() => this.setReadingProgress(progress));
      } else {
        this.updateAttributes();
      }
    });
  }

  setParagraphs(paragraphs: Paragraph[]): void {
    this.paragraphs = paragraphs;
    this.render();
    this.scrollToBeginning();
  }

  private scrollToBeginning(): void {
    const s = this.store.get();
    window.scrollTo(0, 0);
    if (s.writingMode === 'vertical') {
      const scrollContainer = this.container.parentElement;
      if (scrollContainer) {
        // In vertical-rl, scrollLeft=0 is the rightmost (beginning) position
        scrollContainer.scrollLeft = 0;
      }
    }
  }

  private getReadingProgress(writingMode: string): number {
    if (writingMode === 'vertical') {
      const scrollContainer = this.container.parentElement;
      if (!scrollContainer) return 0;
      const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
      if (maxScroll <= 0) return 0;
      // scrollLeft is negative in vertical-rl (RTL), progress goes from 0 at right to 1 at left
      return -scrollContainer.scrollLeft / maxScroll;
    }
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return 0;
    return window.scrollY / maxScroll;
  }

  private setReadingProgress(progress: number): void {
    const s = this.store.get();
    if (s.writingMode === 'vertical') {
      const scrollContainer = this.container.parentElement;
      if (!scrollContainer) return;
      // Wait for layout to settle after mode switch
      requestAnimationFrame(() => {
        const maxScroll = scrollContainer.scrollWidth - scrollContainer.clientWidth;
        scrollContainer.scrollLeft = -(progress * maxScroll);
      });
    } else {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      window.scrollTo(0, progress * maxScroll);
    }
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
