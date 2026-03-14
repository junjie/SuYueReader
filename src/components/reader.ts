import type { Paragraph, InlineFormat, FootnoteRange, CRDRFile } from '../types/index.ts';
import type { SettingsStore } from '../state/settings.ts';
import { getPinyinArray } from '../services/pinyin.ts';
import { convertScript } from '../services/script-convert.ts';
import { segmentText, type Segment } from '../services/segmenter.ts';
import { DefinitionPopup } from './definition-popup.ts';
import { preloadWords, clearCache, hasFootnote, exportCache, loadFromBundle } from '../services/dictionary.ts';

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

/**
 * Segment text with footnote ranges taking priority.
 * Footnote ranges become single forced word segments;
 * the gaps between them are segmented normally.
 */
function segmentWithFootnotes(text: string, footnoteRanges: FootnoteRange[]): Segment[] {
  if (footnoteRanges.length === 0) return segmentText(text);

  const codePoints = [...text];
  // Sort footnote ranges by start position
  const sorted = [...footnoteRanges].sort((a, b) => a.start - b.start);

  const result: Segment[] = [];
  let pos = 0; // current code-point position

  for (const fn of sorted) {
    // Segment the gap before this footnote range
    if (fn.start > pos) {
      const gapText = codePoints.slice(pos, fn.start).join('');
      result.push(...segmentText(gapText));
    }
    // Insert the footnote range as a single word segment
    const fnText = codePoints.slice(fn.start, fn.end).join('');
    result.push({ text: fnText, isWordLike: true });
    pos = fn.end;
  }

  // Segment any remaining text after the last footnote
  if (pos < codePoints.length) {
    const tailText = codePoints.slice(pos).join('');
    result.push(...segmentText(tailText));
  }

  return result;
}

export class Reader {
  private container: HTMLElement;
  private store: SettingsStore;
  private paragraphs: Paragraph[] = [];
  private popup: DefinitionPopup;
  private renderGeneration = 0;
  private rawText = '';
  private textTitle = '';
  // Stored segmentation for .crdr export
  private storedSegments: Map<number, Segment[][]> = new Map();
  // Pre-computed segments from .crdr import (keyed by paragraph index)
  private precomputedSegments: Map<number, Segment[][]> | null = null;

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
      // Don't replace a pinned popup with hover
      if (this.popup.isPinned) return;

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
      if (this.popup.isPinned) return;
      this.popup.scheduleHide();
    });

    // Click: pin popup (desktop) or toggle (touch)
    this.container.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.word') as HTMLElement | null;
      if (!target) return;

      const word = target.dataset.word;
      if (!word) return;

      const isVertical = this.store.get().writingMode === 'vertical';
      this.popup.show(word, target, isVertical, true);
    });
  }

  setParagraphs(paragraphs: Paragraph[], rawText?: string, title?: string): void {
    this.paragraphs = paragraphs;
    this.rawText = rawText || '';
    this.textTitle = title || '';
    this.precomputedSegments = null;
    this.storedSegments.clear();
    clearCache();
    this.render();
    this.scrollToBeginning();
  }

  // Footnotes are stored in the dictionary service via setFootnotes()
  // and matched by position via paragraph.footnoteRanges

  /** Load from a .crdr bundle — sets paragraphs + precomputed data */
  loadBundle(paragraphs: Paragraph[], bundle: CRDRFile): void {
    this.paragraphs = paragraphs;
    this.rawText = bundle.text;
    this.textTitle = bundle.title;

    // Load pre-computed segments
    if (bundle.segments) {
      this.precomputedSegments = new Map();
      for (const [key, lines] of Object.entries(bundle.segments)) {
        this.precomputedSegments.set(
          Number(key),
          lines.map((line) => line.map((s) => ({ text: s.t, isWordLike: s.w })))
        );
      }
    }

    // Load bundled dictionary entries
    if (bundle.dictionary) {
      loadFromBundle(bundle.dictionary);
    }

    this.storedSegments.clear();
    clearCache();
    this.render();
    this.scrollToBeginning();
  }

  /** Export current state as .crdr file data */
  exportCRDR(): CRDRFile {
    const segments: Record<number, { t: string; w: boolean }[][]> = {};
    for (const [idx, lines] of this.storedSegments) {
      segments[idx] = lines.map((line) =>
        line.map((s) => ({ t: s.text, w: s.isWordLike }))
      );
    }

    const dictionary = exportCache();

    return {
      version: 1,
      title: this.textTitle,
      text: this.rawText,
      segments: Object.keys(segments).length > 0 ? segments : undefined,
      dictionary: dictionary || undefined,
    };
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
      const tag = para.type === 'heading2' ? 'h2' : para.type === 'heading3' ? 'h3' : 'p';
      const html = para.text.split('\n').map(line => this.escapeHtml(line)).join('<br>');
      fragments.push(`<${tag} data-index="${para.index}">${html}</${tag}>`);
    }
    this.container.innerHTML = fragments.join('');

    if (scriptVariant) {
      document.dispatchEvent(new CustomEvent('segmentation-progress', { detail: { progress: 0 } }));
    }
  }

  private async segmentAndRender(generation: number): Promise<Set<string>> {
    const s = this.store.get();
    const uniqueWords = new Set<string>();
    const paragraphEls = this.container.querySelectorAll('[data-index]');
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

        const formatting = para.formatting || [];
        const footnoteRanges = para.footnoteRanges || [];
        const lines = text.split('\n');
        const renderedLines: string[] = [];
        let lineOffset = 0;
        const paraSegmentLines: Segment[][] = [];

        for (const line of lines) {
          const lineLen = [...line].length;
          const lineEnd = lineOffset + lineLen;

          // Adjust formatting ranges for this line
          const lineFormatting = formatting
            .filter((f) => f.start < lineEnd && f.end > lineOffset)
            .map((f) => ({
              start: Math.max(f.start - lineOffset, 0),
              end: Math.min(f.end - lineOffset, lineLen),
              type: f.type,
              color: f.color,
            }));

          // Adjust footnote ranges for this line
          const lineFootnoteRanges: FootnoteRange[] = footnoteRanges
            .filter((f) => f.start < lineEnd && f.end > lineOffset)
            .map((f) => ({
              start: Math.max(f.start - lineOffset, 0),
              end: Math.min(f.end - lineOffset, lineLen),
              key: f.key,
            }));

          // Use precomputed segments if available, otherwise segment
          // with footnote ranges forcing whole-phrase segments
          let lineSegments: Segment[];
          const precomputed = this.precomputedSegments?.get(para.index);
          if (precomputed && precomputed[renderedLines.length]) {
            lineSegments = precomputed[renderedLines.length];
          } else {
            lineSegments = segmentWithFootnotes(line, lineFootnoteRanges);
          }

          paraSegmentLines.push(lineSegments);

          renderedLines.push(
            await this.renderLine(
              line, lineSegments, s.showPinyin, uniqueWords,
              lineFormatting, lineFootnoteRanges
            )
          );

          lineOffset = lineEnd + 1;
        }

        // Store segments for .crdr export
        this.storedSegments.set(para.index, paraSegmentLines);

        const el = paragraphEls[j] as HTMLElement | undefined;
        if (el) {
          el.innerHTML = renderedLines.join('<br>');
        }
      }

      const progress = Math.min(end / total, 1);
      document.dispatchEvent(new CustomEvent('segmentation-progress', { detail: { progress } }));

      if (end < total) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    return uniqueWords;
  }

  private async renderLine(
    text: string,
    segments: Segment[],
    showPinyin: boolean,
    uniqueWords: Set<string> | undefined,
    formatting: InlineFormat[],
    footnoteRanges: FootnoteRange[],
  ): Promise<string> {
    let pinyinArr: string[] | null = null;
    if (showPinyin) {
      pinyinArr = await getPinyinArray(text);
    }

    let result = '';
    let pIdx = 0;
    let charPos = 0;

    for (const seg of segments) {
      const chars = [...seg.text];
      const segLen = chars.length;
      const segEnd = charPos + segLen;
      const hasCjk = chars.some((c) => CJK_RE.test(c));

      // Determine formatting wrappers
      const fmtOpen: string[] = [];
      const fmtClose: string[] = [];
      if (formatting.length > 0) {
        for (const f of formatting) {
          if (charPos < f.end && segEnd > f.start) {
            if (f.type === 'bold') {
              fmtOpen.push('<strong>');
              fmtClose.unshift('</strong>');
            } else if (f.type === 'underline') {
              fmtOpen.push('<u>');
              fmtClose.unshift('</u>');
            } else if (f.type === 'highlight' && f.color) {
              fmtOpen.push(`<span class="hl-${f.color}">`);
              fmtClose.unshift('</span>');
            }
          }
        }
      }

      // Check if this segment overlaps any footnote range (position-based)
      const matchedFootnote = footnoteRanges.find(
        (fn) => charPos < fn.end && segEnd > fn.start
      );

      if (seg.isWordLike && hasCjk) {
        uniqueWords?.add(seg.text);
        const hasNote = !!matchedFootnote || hasFootnote(seg.text);
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
        const fnKeyAttr = matchedFootnote ? ` data-footnote-key="${this.escapeAttr(matchedFootnote.key)}"` : '';
        result += fmtOpen.join('');
        result += `<span class="word${hasNote ? ' has-footnote' : ''}" data-word="${this.escapeAttr(seg.text)}"${fnKeyAttr}>${inner}</span>`;
        result += fmtClose.join('');
      } else {
        result += fmtOpen.join('');
        for (const char of chars) {
          if (showPinyin && pinyinArr && CJK_RE.test(char)) {
            const py = pinyinArr[pIdx] || '';
            result += `<ruby>${this.escapeHtml(char)}<rp>(</rp><rt>${py}</rt><rp>)</rp></ruby>`;
          } else {
            result += this.escapeHtml(char);
          }
          pIdx++;
        }
        result += fmtClose.join('');
      }

      charPos = segEnd;
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
