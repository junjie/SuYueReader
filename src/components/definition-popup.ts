import { lookup, lookupChar, isLoaded, cachedLookup, getFootnote, type DictEntry } from '../services/dictionary.ts';
import type { SettingsStore } from '../state/settings.ts';

const CJK_RE = /[\u4e00-\u9fff\u3400-\u4dbf]/;

export class DefinitionPopup {
  private el: HTMLDivElement;
  private store: SettingsStore;
  private currentWord: string | null = null;
  private currentFootnoteKey: string | null = null;
  private activeAnchor: HTMLElement | null = null;
  private history: string[] = [];
  private hideTimeout: ReturnType<typeof setTimeout> | null = null;
  private showTimeout: ReturnType<typeof setTimeout> | null = null;
  private _justDrilledDown = false;
  private pinned = false;

  constructor(store: SettingsStore) {
    this.store = store;
    this.el = document.createElement('div');
    this.el.className = 'dict-popup';
    document.body.appendChild(this.el);

    // Keep popup visible while pointer is inside it
    this.el.addEventListener('pointerenter', () => {
      this.cancelHide();
    });
    this.el.addEventListener('pointerleave', () => {
      if (!this.pinned) this.scheduleHide();
    });

    // Handle clicks inside the popup (character drill-down, back button, dict config)
    this.el.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = e.target as HTMLElement;
      const charEl = target.closest('.dict-popup-char-link') as HTMLElement | null;
      if (charEl) {
        const char = charEl.textContent?.trim();
        if (char) this.drillDown(char);
        return;
      }
      const backEl = target.closest('.dict-popup-back');
      if (backEl) {
        this.goBack();
        return;
      }
      const configEl = target.closest('.dict-popup-config');
      if (configEl) {
        this.hide();
        document.dispatchEvent(new CustomEvent('open-dict-settings'));
      }
    });

    // Dismiss on click outside
    document.addEventListener('pointerdown', (e) => {
      if (!this.el.classList.contains('visible')) return;
      if (this.el.contains(e.target as Node)) return;
      // Guard against iPad drill-down dismissal
      if (this._justDrilledDown) return;
      // Don't dismiss if clicking a word (that will trigger a new lookup)
      const wordEl = (e.target as HTMLElement).closest?.('.word');
      if (wordEl) return;
      this.hide();
    });

    // Dismiss on scroll
    const onScroll = () => {
      if (this.el.classList.contains('visible')) this.hide();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    document.getElementById('reader-container')?.addEventListener('scroll', onScroll, { passive: true });
  }

  async show(word: string, anchor: HTMLElement, isVertical: boolean, pin = false): Promise<void> {
    this.cancelHide();
    this.cancelShow();

    // If clicking the same word that's already visible, just pin it in place
    if (pin && this.currentWord === word && this.el.classList.contains('visible')) {
      this.pinned = true;
      this.el.classList.add('pinned');
      return;
    }

    this.clearActive();
    this.currentWord = word;
    this.currentFootnoteKey = anchor.dataset.footnoteKey || null;
    this.activeAnchor = anchor;
    anchor.classList.add('active');
    this.history = [];
    this.pinned = pin;
    this.el.classList.toggle('pinned', pin);

    // Try cached lookup first (synchronous)
    const cached = cachedLookup(word);
    if (cached !== undefined) {
      this.renderEntries(word, cached);
      this.position(anchor, isVertical);
      this.el.classList.add('visible');
      return;
    }

    // Show loading state if dict isn't loaded yet
    if (!isLoaded()) {
      this.el.innerHTML = '<div class="dict-popup-body"><div class="dict-popup-loading">Loading dictionary</div></div>';
      this.position(anchor, isVertical);
      this.el.classList.add('visible');
    }

    const entries = await lookup(word);
    // Check we're still showing this word
    if (this.currentWord !== word) return;

    this.renderEntries(word, entries);
    this.position(anchor, isVertical);
    this.el.classList.add('visible');
  }

  private renderEntries(word: string, entries: DictEntry[] | null): void {
    let inner = '';
    if (this.history.length > 0) {
      inner += `<button class="dict-popup-back">\u2190 back</button>`;
    }
    inner += this.buildContent(word, entries);
    this.el.innerHTML = `<div class="dict-popup-body">${inner}</div>`;
  }

  private static DICT_LABELS: Record<string, string> = {
    cedict: 'CC-CEDICT',
    cvdict: 'CVDICT',
  };

  private buildContent(word: string, entries: DictEntry[] | null): string {
    const chars = [...word].filter((c) => CJK_RE.test(c));
    const footnote = getFootnote(this.currentFootnoteKey || word);
    const settings = this.store.get();

    // Group entries by source, filtered by enabled setting
    const bySource: Record<string, DictEntry[]> = {};
    if (entries) {
      for (const e of entries) {
        const enabled = e.source === 'cedict' ? settings.showCedict : settings.showCvdict;
        if (!enabled) continue;
        if (!bySource[e.source]) bySource[e.source] = [];
        bySource[e.source].push(e);
      }
    }

    // Render in dictOrder
    const orderedSources = settings.dictOrder.filter((id) => bySource[id]?.length > 0);
    const hasAnyDict = orderedSources.length > 0;

    // Count visible sources for labeling
    const sourceCount = (footnote ? 1 : 0) + orderedSources.length;
    const showLabels = sourceCount > 1;

    // Header with word + config button
    let html = `<div class="dict-popup-header"><span class="dict-popup-word">${this.buildWordChars(word, chars)}</span><button class="dict-popup-config" aria-label="Configure dictionaries" title="Configure dictionaries">⚙</button></div>`;

    // Footnote source
    if (footnote) {
      html += `<div class="dict-popup-source">`;
      if (showLabels) {
        html += `<div class="dict-popup-source-label">Note</div>`;
      }
      html += `<div class="dict-popup-footnote-text">${this.renderFootnote(footnote)}</div>`;
      html += `</div>`;
    }

    // Dictionary sources in order
    for (const source of orderedSources) {
      html += `<div class="dict-popup-source">`;
      if (showLabels) {
        html += `<div class="dict-popup-source-label">${DefinitionPopup.DICT_LABELS[source] || source}</div>`;
      }
      html += this.buildDictHtml(word, bySource[source]);
      html += `</div>`;
    }

    // Nothing found
    if (!footnote && !hasAnyDict) {
      html += `<div class="dict-popup-notfound">No definition found</div>`;
    }

    return html;
  }

  private buildDictHtml(word: string, entries: DictEntry[]): string {
    let html = '';
    const first = entries[0];
    const showTrad = first.traditional !== word;

    if (entries.length === 1) {
      html += `<span class="dict-popup-pinyin">${this.esc(first.pinyin)}</span>`;
      if (showTrad) {
        html += `<span class="dict-popup-trad">${this.esc(first.traditional)}</span>`;
      }
      html += `<ol class="dict-popup-defs">`;
      for (const d of first.definitions) {
        html += `<li>${this.esc(d)}</li>`;
      }
      html += `</ol>`;
    } else {
      // Multiple entries (e.g. different pronunciations)
      for (const entry of entries) {
        html += `<div class="dict-popup-entry">`;
        html += `<div class="dict-popup-entry-pinyin">${this.esc(entry.pinyin)}`;
        if (entry.traditional !== word) {
          html += ` <span class="dict-popup-trad">${this.esc(entry.traditional)}</span>`;
        }
        html += `</div>`;
        html += `<ol class="dict-popup-defs">`;
        for (const d of entry.definitions) {
          html += `<li>${this.esc(d)}</li>`;
        }
        html += `</ol></div>`;
      }
    }

    return html;
  }

  /** Build word header with clickable char links for multi-char words */
  private buildWordChars(word: string, cjkChars: string[]): string {
    if (cjkChars.length <= 1) {
      return this.esc(word);
    }
    // Wrap each character: CJK chars become clickable links, others stay plain
    let html = '';
    for (const char of [...word]) {
      if (CJK_RE.test(char)) {
        html += `<span class="dict-popup-char-link">${this.esc(char)}</span>`;
      } else {
        html += this.esc(char);
      }
    }
    return html;
  }

  private async drillDown(char: string): Promise<void> {
    this.cancelHide();
    if (this.currentWord) {
      this.history.push(this.currentWord);
    }
    this.currentWord = char;
    this.currentFootnoteKey = null; // drill-down uses word-based lookup

    // Set flag to prevent dismissal from residual touch events
    this._justDrilledDown = true;
    requestAnimationFrame(() => {
      this._justDrilledDown = false;
    });

    // Try cached lookup first, fall back to async
    const cached = cachedLookup(char);
    let entries: DictEntry[] | null;
    if (cached !== undefined) {
      entries = cached;
    } else {
      entries = await lookupChar(char);
    }
    if (this.currentWord !== char) return;
    this.renderEntries(char, entries);
  }

  private async goBack(): Promise<void> {
    this.cancelHide();
    const prev = this.history.pop();
    if (!prev) return;
    this.currentWord = prev;

    // Set flag to prevent dismissal from residual touch events
    this._justDrilledDown = true;
    requestAnimationFrame(() => {
      this._justDrilledDown = false;
    });

    // Try cached lookup first, fall back to async
    const cached = cachedLookup(prev);
    let entries: DictEntry[] | null;
    if (cached !== undefined) {
      entries = cached;
    } else {
      entries = await lookup(prev);
    }
    if (this.currentWord !== prev) return;
    this.renderEntries(prev, entries);
  }

  private position(anchor: HTMLElement, isVertical: boolean): void {
    const rect = anchor.getBoundingClientRect();
    const pad = 8;

    // Reset to measure
    this.el.style.left = '0';
    this.el.style.top = '0';
    const popupRect = this.el.getBoundingClientRect();

    let left: number;
    let top: number;
    let placement: string;

    if (isVertical) {
      // Position to the left of the word
      left = rect.left - popupRect.width - pad;
      top = rect.top;
      placement = 'popup-left';
      // If not enough space on the left, put it on the right
      if (left < pad) {
        left = rect.right + pad;
        placement = 'popup-right';
      }
    } else {
      // Position above the word, centered
      left = rect.left + rect.width / 2 - popupRect.width / 2;
      top = rect.top - popupRect.height - pad;
      placement = 'popup-above';
      // If not enough space above, put it below
      if (top < pad) {
        top = rect.bottom + pad;
        placement = 'popup-below';
      }
    }

    // Clamp to viewport
    left = Math.max(pad, Math.min(left, window.innerWidth - popupRect.width - pad));
    top = Math.max(pad, Math.min(top, window.innerHeight - popupRect.height - pad));

    this.el.style.left = `${left}px`;
    this.el.style.top = `${top}px`;

    // Set placement class for hover bridge direction
    this.el.classList.remove('popup-above', 'popup-below', 'popup-left', 'popup-right');
    this.el.classList.add(placement);
  }

  scheduleHide(): void {
    this.cancelHide();
    this.hideTimeout = setTimeout(() => this.hide(), 200);
  }

  cancelHide(): void {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private cancelShow(): void {
    if (this.showTimeout) {
      clearTimeout(this.showTimeout);
      this.showTimeout = null;
    }
  }

  scheduleShow(word: string, anchor: HTMLElement, isVertical: boolean): void {
    this.cancelShow();
    // Apply highlight immediately so hover feels instant
    this.clearActive();
    this.activeAnchor = anchor;
    anchor.classList.add('active');
    this.showTimeout = setTimeout(() => this.show(word, anchor, isVertical), 50);
  }

  hide(): void {
    this.cancelHide();
    this.cancelShow();
    this.clearActive();
    this.el.classList.remove('visible', 'pinned');
    this.currentWord = null;
    this.currentFootnoteKey = null;
    this.history = [];
    this.pinned = false;
  }

  private clearActive(): void {
    if (this.activeAnchor) {
      this.activeAnchor.classList.remove('active');
      this.activeAnchor = null;
    }
  }

  get isVisible(): boolean {
    return this.el.classList.contains('visible');
  }

  get isPinned(): boolean {
    return this.pinned;
  }

  /** Render footnote text: \n\n → paragraph break, \n → line break */
  private renderFootnote(text: string): string {
    return text
      .split('\n\n')
      .map((para) => `<p>${this.esc(para).replace(/\n/g, '<br>')}</p>`)
      .join('');
  }

  private esc(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}
