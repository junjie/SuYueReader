import type { Paragraph } from '../types/index.ts';
import type { SettingsStore } from '../state/settings.ts';
import { getPinyinArray } from '../services/pinyin.ts';
import { convertScript } from '../services/script-convert.ts';
import { segmentText } from '../services/segmenter.ts';
import { DefinitionPopup } from './definition-popup.ts';
import { preloadWords, clearCache } from '../services/dictionary.ts';

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

export class Reader {
  private container: HTMLElement;
  private store: SettingsStore;
  private paragraphs: Paragraph[] = [];
  private popup: DefinitionPopup;
  private renderGeneration = 0;

  constructor(container: HTMLElement, store: SettingsStore) {
    this.container = container;
    this.store = store;
    this.popup = new DefinitionPopup();

    document.addEventListener('settings-changed', (e) => {
      const detail = (e as CustomEvent).detail;
      if (detail.pinyinChanged || detail.scriptVariantChanged) {
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

    this.setupInteraction();
  }

  private setupInteraction(): void {
    // Hover: show popup on mouse, with debounce
    this.container.addEventListener('pointerover', (e) => {
      const target = (e.target as HTMLElement).closest('.word') as HTMLElement | null;
      if (!target) return;
      if (e.pointerType !== 'mouse') return;

      const word = target.dataset.word;
      if (!word) return;

      this.popup.cancelHide();
      const isVertical = this.store.get().writingMode === 'vertical';
      this.popup.scheduleShow(word, target, isVertical);
    });

    this.container.addEventListener('pointerout', (e) => {
      const target = (e.target as HTMLElement).closest('.word');
      if (!target) return;
      if (e.pointerType !== 'mouse') return;
      this.popup.scheduleHide();
    });

    // Tap: toggle popup on touch devices
    this.container.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.word') as HTMLElement | null;
      if (!target) return;

      const word = target.dataset.word;
      if (!word) return;

      const isVertical = this.store.get().writingMode === 'vertical';
      this.popup.show(word, target, isVertical);
    });
  }

  setParagraphs(paragraphs: Paragraph[]): void {
    this.paragraphs = paragraphs;
    clearCache();
    this.render();
    this.scrollToBeginning();
  }

  private scrollToBeginning(): void {
    const s = this.store.get();
    window.scrollTo(0, 0);
    if (s.writingMode === 'vertical') {
      const scrollContainer = this.container.parentElement;
      if (scrollContainer) {
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
    const generation = ++this.renderGeneration;

    if (this.paragraphs.length === 0) {
      this.container.innerHTML =
        '<p class="reader-placeholder">Load a text to begin reading.</p>';
      return;
    }

    // Phase 1: Render plain text immediately
    this.renderPlain(s.scriptVariant !== 'original' ? s.scriptVariant : null);

    // Phase 2: Segment paragraphs and re-render with word spans
    const uniqueWords = await this.segmentAndRender(generation);
    if (this.renderGeneration !== generation) return;

    // Phase 3: Preload definitions for all unique words
    if (uniqueWords.size > 0) {
      await preloadWords([...uniqueWords]);
    }
  }

  private renderPlain(scriptVariant: string | null): void {
    const fragments: string[] = [];
    for (const para of this.paragraphs) {
      fragments.push(`<p data-index="${para.index}">${this.escapeHtml(para.text)}</p>`);
    }
    this.container.innerHTML = fragments.join('');

    // Script conversion will be applied during segmentation phase
    if (scriptVariant) {
      // Dispatch progress event to show we're starting
      document.dispatchEvent(new CustomEvent('segmentation-progress', { detail: { progress: 0 } }));
    }
  }

  private async segmentAndRender(generation: number): Promise<Set<string>> {
    const s = this.store.get();
    const uniqueWords = new Set<string>();
    const paragraphEls = this.container.querySelectorAll('p[data-index]');
    const total = this.paragraphs.length;
    const batchSize = 20;

    for (let i = 0; i < total; i += batchSize) {
      if (this.renderGeneration !== generation) return uniqueWords;

      const end = Math.min(i + batchSize, total);
      for (let j = i; j < end; j++) {
        const para = this.paragraphs[j];
        let text = para.text;
        if (s.scriptVariant !== 'original') {
          text = await convertScript(text, s.scriptVariant);
        }
        const content = await this.renderParagraph(text, s.showPinyin, uniqueWords);
        const el = paragraphEls[j] as HTMLElement | undefined;
        if (el) {
          el.innerHTML = content;
        }
      }

      // Report progress
      const progress = Math.min(end / total, 1);
      document.dispatchEvent(new CustomEvent('segmentation-progress', { detail: { progress } }));

      // Yield to main thread between batches
      if (end < total) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return uniqueWords;
  }

  private async renderParagraph(text: string, showPinyin: boolean, uniqueWords?: Set<string>): Promise<string> {
    // Get pinyin for full text first (context-aware polyphone resolution)
    let pinyinArr: string[] | null = null;
    if (showPinyin) {
      pinyinArr = await getPinyinArray(text);
    }

    const segments = segmentText(text);
    let result = '';
    let pIdx = 0; // tracks position in pinyin array

    for (const seg of segments) {
      const chars = [...seg.text];
      const hasCjk = chars.some((c) => CJK_RE.test(c));

      if (seg.isWordLike && hasCjk) {
        // CJK word — wrap in a .word span
        uniqueWords?.add(seg.text);
        let inner = '';
        for (const char of chars) {
          if (showPinyin && pinyinArr && CJK_RE.test(char)) {
            const py = pinyinArr[pIdx] || '';
            inner += `<ruby>${this.escapeHtml(char)}<rp>(</rp><rt>${py}</rt><rp>)</rp></ruby>`;
          } else {
            inner += this.escapeHtml(char);
          }
          pIdx++;
        }
        result += `<span class="word" data-word="${this.escapeAttr(seg.text)}">${inner}</span>`;
      } else {
        // Non-word: punctuation, whitespace, Latin text
        for (const char of chars) {
          if (showPinyin && pinyinArr && CJK_RE.test(char)) {
            const py = pinyinArr[pIdx] || '';
            result += `<ruby>${this.escapeHtml(char)}<rp>(</rp><rt>${py}</rt><rp>)</rp></ruby>`;
          } else {
            result += this.escapeHtml(char);
          }
          pIdx++;
        }
      }
    }

    return result;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeAttr(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
