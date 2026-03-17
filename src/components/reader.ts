import type { Paragraph, InlineFormat, FootnoteRange, SYFile } from '../types/index.ts';
import type { SettingsStore } from '../state/settings.ts';
import { getPinyinArray } from '../services/pinyin.ts';
import { convertScript } from '../services/script-convert.ts';
import { segmentText, refineSegments, type Segment } from '../services/segmenter.ts';
import { DefinitionPopup } from './definition-popup.ts';
import { preloadWords, clearCache, hasFootnote, exportCache, loadFromBundle, ensureReady, hasEntry } from '../services/dictionary.ts';
import { ttsGetState, ttsJumpTo } from '../services/tts.ts';

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

/** Check if two word elements are on the same visual line */
function isSameLine(a: HTMLElement, b: HTMLElement, isVertical: boolean): boolean {
  const ra = a.getBoundingClientRect();
  const rb = b.getBoundingClientRect();
  const tolerance = Math.min(ra.height, rb.height, ra.width, rb.width) / 2;
  if (isVertical) {
    return Math.abs(ra.left - rb.left) < tolerance;
  }
  return Math.abs(ra.top - rb.top) < tolerance;
}

/** Check if two word elements are DOM-adjacent within the same paragraph */
function isDomAdjacent(a: HTMLElement, b: HTMLElement): boolean {
  const paraA = a.closest('[data-index]');
  const paraB = b.closest('[data-index]');
  if (!paraA || !paraB || paraA !== paraB) return false;
  const words = Array.from(paraA.querySelectorAll('.word'));
  const idxA = words.indexOf(a);
  const idxB = words.indexOf(b);
  if (idxA === -1 || idxB === -1) return false;
  return Math.abs(idxA - idxB) === 1;
}

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
  // Stored segmentation for .sy export
  private storedSegments: Map<number, Segment[][]> = new Map();
  // Pre-computed segments from .sy import (keyed by paragraph index)
  private precomputedSegments: Map<number, Segment[][]> | null = null;
  private builtInId: string | null = null;

  constructor(container: HTMLElement, store: SettingsStore) {
    this.container = container;
    this.store = store;
    this.popup = new DefinitionPopup(store);

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
    // Hover: highlight word but don't show popup
    // (popup is shown only on click, below)

    this.container.addEventListener('pointerout', (e) => {
      const target = (e.target as HTMLElement).closest('.word');
      if (!target) return;
      if (e.pointerType !== 'mouse') return;
      if (this.popup.isPinned) return;
      this.popup.scheduleHide();
    });

    // Track pointer type so click handler knows touch vs mouse
    let lastPointerType = '';
    this.container.addEventListener('pointerdown', (e) => {
      lastPointerType = e.pointerType;
    });

    // Click: pin popup (desktop) or toggle (touch)
    this.container.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.word') as HTMLElement | null;
      if (!target) return;

      const word = target.dataset.word;
      if (!word) return;

      const isVertical = this.store.get().writingMode === 'vertical';

      // During TTS (playing or paused): tap jumps reading to that word.
      // Exception: tapping the currently-highlighted word shows the popup.
      const ttsState = ttsGetState();
      if (ttsState !== 'stopped') {
        if (target.classList.contains('tts-active')) {
          // Already the active TTS word — show definition popup
        } else {
          ttsJumpTo(target);
          return;
        }
      }

      // On touch devices, if a popup is pinned and the tap is on a different
      // word that isn't nearby, just dismiss the popup instead of showing
      // the new word's definition.
      if (lastPointerType !== 'mouse' && this.popup.isPinned) {
        const currentAnchor = this.popup.anchor;
        if (currentAnchor && currentAnchor !== target) {
          if (!isSameLine(currentAnchor, target, isVertical) && !isDomAdjacent(currentAnchor, target)) {
            this.popup.hide();
            return;
          }
        }
      }

      this.popup.show(word, target, isVertical, true);
    });
  }

  setParagraphs(paragraphs: Paragraph[], rawText?: string, title?: string, builtInId?: string): void {
    this.paragraphs = paragraphs;
    this.rawText = rawText || '';
    this.textTitle = title || '';
    this.builtInId = builtInId || null;
    this.precomputedSegments = null;
    this.storedSegments.clear();
    clearCache();
    this.render();
    this.scrollToBeginning();
  }

  // Footnotes are stored in the dictionary service via setFootnotes()
  // and matched by position via paragraph.footnoteRanges

  /** Load from a .sy bundle — sets paragraphs + precomputed data */
  loadBundle(paragraphs: Paragraph[], bundle: SYFile): void {
    this.paragraphs = paragraphs;
    this.rawText = bundle.text;
    this.textTitle = bundle.title;
    this.builtInId = null;

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

  /** Export current state as .sy file data */
  exportSY(): SYFile {
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
        '<p class="reader-placeholder">载入文本开始阅读<br><span style="font-size:0.6em;opacity:0.6">Load a text to begin reading.</span></p>';
      return;
    }

    // Phase 1: Render plain text immediately
    this.renderPlain(s.scriptVariant !== 'original' ? s.scriptVariant : null);

    // Phase 2: Segment paragraphs and re-render with word spans
    const uniqueWords = await this.segmentAndRender(generation);
    if (this.renderGeneration !== generation) return;

    // Append share link for built-in texts
    this.appendShareLink();

    // Phase 3: Preload definitions for all unique words
    if (uniqueWords.size > 0) {
      await preloadWords([...uniqueWords]);
    }
  }

  private appendShareLink(): void {
    if (!this.builtInId) return;
    const textId = this.builtInId;

    const wrapper = document.createElement('div');
    wrapper.className = 'share-link';
    wrapper.innerHTML = `<span class="share-link-btn"><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2L22 12 12 22v-6c-5.5 0-9.5 1.5-12 6 1-6 4.5-12 12-14V2z"/></svg></span>`;

    const btn = wrapper.querySelector('.share-link-btn')!;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = `${window.location.origin}${import.meta.env.BASE_URL}?text=${textId}`;
      const showToast = () => {
        let toast = document.querySelector('.share-toast');
        if (toast) toast.remove();
        toast = document.createElement('div');
        toast.className = 'share-toast';
        toast.textContent = '已複製連結 Copied Link';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 1500);
      };
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(url).then(showToast, showToast);
      } else {
        const ta = document.createElement('textarea');
        ta.value = url;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;width:1px;height:1px';
        document.body.appendChild(ta);
        ta.focus({ preventScroll: true });
        ta.select();
        document.execCommand('copy');
        ta.remove();
        showToast();
      }
    });
    this.container.appendChild(wrapper);
  }

  private renderPlain(scriptVariant: string | null): void {
    const fragments: string[] = [];
    for (let i = 0; i < this.paragraphs.length; i++) {
      const para = this.paragraphs[i];
      const html = para.text.split('\n').map(line => this.escapeHtml(line)).join('<br>');

      if (para.type === 'list-bullet' || para.type === 'list-ordered') {
        const listTag = para.type === 'list-bullet' ? 'ul' : 'ol';
        const prev = this.paragraphs[i - 1];
        const next = this.paragraphs[i + 1];
        const isFirst = prev?.type !== para.type || prev?.index !== para.index;
        const isLast = next?.type !== para.type || next?.index !== para.index;
        let out = '';
        if (isFirst) out += `<${listTag} data-list-index="${para.index}">`;
        out += `<li data-index="${para.index}">${html}</li>`;
        if (isLast) out += `</${listTag}>`;
        fragments.push(out);
      } else {
        const tag = para.type === 'heading2' ? 'h2' : para.type === 'heading3' ? 'h3' : 'p';
        fragments.push(`<${tag} data-index="${para.index}">${html}</${tag}>`);
      }
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

    // Load dictionaries so hasEntry() works synchronously during segmentation
    await ensureReady();
    if (this.renderGeneration !== generation) return uniqueWords;

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

          // Refine segments: split 3+ CJK char words with no dict entry
          lineSegments = refineSegments(lineSegments, hasEntry);

          paraSegmentLines.push(lineSegments);

          renderedLines.push(
            await this.renderLine(
              line, lineSegments, s.showPinyin, uniqueWords,
              lineFormatting, lineFootnoteRanges
            )
          );

          lineOffset = lineEnd + 1;
        }

        // Store segments for .sy export
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

    // Build a flat list of characters with their formatting applied.
    // Formatting tags are emitted at character boundaries, so they work
    // correctly even when a format range starts or ends mid-segment.
    // Word spans wrap the characters but sit *inside* the formatting spans,
    // so one highlight can cover multiple word spans seamlessly.

    let result = '';
    let pIdx = 0;
    let charPos = 0;
    const activeFormats = new Set<InlineFormat>();

    for (const seg of segments) {
      const chars = [...seg.text];
      const segLen = chars.length;
      const segEnd = charPos + segLen;
      const hasCjk = chars.some((c) => CJK_RE.test(c));

      // Check if this segment overlaps any footnote range (position-based)
      const matchedFootnote = footnoteRanges.find(
        (fn) => charPos < fn.end && segEnd > fn.start
      );

      // Check if any formatting boundary falls inside this segment (not at edges)
      const hasMidBoundary = formatting.some((f) =>
        (f.start > charPos && f.start < segEnd) || (f.end > charPos && f.end < segEnd)
      );

      if (hasMidBoundary && seg.isWordLike && hasCjk) {
        // Formatting boundary splits this segment — render char by char,
        // each character as its own word span (same data-word for dictionary).
        uniqueWords?.add(seg.text);
        const hasNote = !!matchedFootnote || hasFootnote(seg.text);
        const fnKeyAttr = matchedFootnote ? ` data-footnote-key="${this.escapeAttr(matchedFootnote.key)}"` : '';

        for (let ci = 0; ci < chars.length; ci++) {
          const cPos = charPos + ci;
          // Close formats that end at this character position
          for (const f of activeFormats) {
            if (f.end <= cPos) { result += this.fmtCloseTag(f); activeFormats.delete(f); }
          }
          // Open formats that start at this character position
          for (const f of formatting) {
            if (!activeFormats.has(f) && f.start <= cPos && f.end > cPos) {
              result += this.fmtOpenTag(f); activeFormats.add(f);
            }
          }

          const char = chars[ci];
          let charHtml: string;
          if (showPinyin && pinyinArr && CJK_RE.test(char)) {
            const py = pinyinArr[pIdx] || '';
            charHtml = `<ruby>${this.escapeHtml(char)}<rp>(</rp><rt>${py}</rt><rp>)</rp></ruby>`;
          } else {
            charHtml = this.escapeHtml(char);
          }
          pIdx++;
          result += `<span class="word${hasNote ? ' has-footnote' : ''}" data-word="${this.escapeAttr(seg.text)}"${fnKeyAttr}>${charHtml}</span>`;
        }
      } else {
        // No mid-boundary — emit formatting open/close at segment edges
        // Close formats that end at or before this segment's start
        for (const f of activeFormats) {
          if (f.end <= charPos) { result += this.fmtCloseTag(f); activeFormats.delete(f); }
        }
        // Open formats that cover this segment
        for (const f of formatting) {
          if (!activeFormats.has(f) && f.start <= charPos && f.end > charPos) {
            result += this.fmtOpenTag(f); activeFormats.add(f);
          }
        }

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
          result += `<span class="word${hasNote ? ' has-footnote' : ''}" data-word="${this.escapeAttr(seg.text)}"${fnKeyAttr}>${inner}</span>`;
        } else {
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

      charPos = segEnd;
    }

    // Close any remaining open formats
    for (const f of activeFormats) {
      result += this.fmtCloseTag(f);
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

  private fmtOpenTag(f: InlineFormat): string {
    if (f.type === 'bold') return '<strong>';
    if (f.type === 'underline') return '<u>';
    if (f.type === 'highlight' && f.color) return `<span class="hl-${f.color}">`;
    return '';
  }

  private fmtCloseTag(f: InlineFormat): string {
    if (f.type === 'bold') return '</strong>';
    if (f.type === 'underline') return '</u>';
    if (f.type === 'highlight') return '</span>';
    return '';
  }
}
