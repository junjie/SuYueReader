export interface DictEntry {
  traditional: string;
  pinyin: string;
  definitions: string[];
}

interface RawEntry {
  t: string;
  p: string;
  d: string[];
}

let dictMap: Map<string, DictEntry[]> | null = null;
let loadPromise: Promise<void> | null = null;

async function loadDict(): Promise<void> {
  if (dictMap) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const base = import.meta.env.BASE_URL;
    const resp = await fetch(`${base}dict/cedict.json`);
    const data: Record<string, RawEntry[]> = await resp.json();

    dictMap = new Map();
    for (const [key, entries] of Object.entries(data)) {
      dictMap.set(
        key,
        entries.map((e) => ({
          traditional: e.t,
          pinyin: e.p,
          definitions: e.d,
        }))
      );
    }
  })();
  return loadPromise;
}

let toSimplifiedFn: ((text: string) => string) | null = null;

async function ensureSimplifiedConverter(): Promise<(text: string) => string> {
  if (toSimplifiedFn) return toSimplifiedFn;
  const OpenCC = await import('opencc-js');
  toSimplifiedFn = OpenCC.Converter({ from: 'tw', to: 'cn' });
  return toSimplifiedFn;
}

export async function lookup(word: string): Promise<DictEntry[] | null> {
  await loadDict();
  if (!dictMap) return null;

  // Try direct lookup
  const direct = dictMap.get(word);
  if (direct) return direct;

  // Try converting to simplified
  const toSimplified = await ensureSimplifiedConverter();
  const simplified = toSimplified(word);
  if (simplified !== word) {
    const result = dictMap.get(simplified);
    if (result) return result;
  }

  return null;
}

export async function lookupChar(char: string): Promise<DictEntry[] | null> {
  return lookup(char);
}

/** Preload the dictionary (fire-and-forget) */
export function preload(): void {
  loadDict();
}

/** Check if the dictionary has been loaded */
export function isLoaded(): boolean {
  return dictMap !== null;
}

// --- Per-text definition cache ---

let textCache: Map<string, DictEntry[] | null> | null = null;

/** Preload definitions for a set of words (call after segmentation) */
export async function preloadWords(words: string[]): Promise<void> {
  await loadDict();
  textCache = new Map();
  for (const word of words) {
    textCache.set(word, await lookup(word));
  }
}

/** Synchronous lookup from cache. Returns undefined if not cached. */
export function cachedLookup(word: string): DictEntry[] | null | undefined {
  return textCache?.get(word);
}

/** Clear the per-text cache (call when loading a new text) */
export function clearCache(): void {
  textCache = null;
}

// --- Footnote definitions (custom per-text notes) ---

let footnoteMap: Map<string, string> | null = null;

/** Set footnote definitions for the current text */
export function setFootnotes(footnotes: Map<string, string>): void {
  footnoteMap = footnotes.size > 0 ? footnotes : null;
}

/** Get footnote text for a word, or null */
export function getFootnote(word: string): string | null {
  return footnoteMap?.get(word) ?? null;
}

/** Check if a word has a footnote definition */
export function hasFootnote(word: string): boolean {
  return footnoteMap?.has(word) ?? false;
}

/** Get the footnote map (for .crdr export, script conversion) */
export function getFootnoteMap(): Map<string, string> | null {
  return footnoteMap;
}

/** Load dictionary entries directly from a .crdr bundle (skips fetch) */
export function loadFromBundle(entries: Record<string, { t: string; p: string; d: string[] }[]>): void {
  dictMap = new Map();
  for (const [key, rawEntries] of Object.entries(entries)) {
    dictMap.set(
      key,
      rawEntries.map((e) => ({
        traditional: e.t,
        pinyin: e.p,
        definitions: e.d,
      }))
    );
  }
  // Also mark as loaded
  loadPromise = Promise.resolve();
}

/** Export cached dictionary entries (for .crdr export) */
export function exportCache(): Record<string, { t: string; p: string; d: string[] }[]> | null {
  if (!textCache) return null;
  const result: Record<string, { t: string; p: string; d: string[] }[]> = {};
  for (const [word, entries] of textCache) {
    if (entries) {
      result[word] = entries.map((e) => ({
        t: e.traditional,
        p: e.pinyin,
        d: e.definitions,
      }));
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
