export type DictSource = 'cedict' | 'cvdict';

export interface DictEntry {
  traditional: string;
  pinyin: string;
  definitions: string[];
  source: DictSource;
}

interface RawEntry {
  t: string;
  p: string;
  d: string[];
  s?: DictSource; // present in .crdr bundles with source info
}

let cedictMap: Map<string, DictEntry[]> | null = null;
let cvdictMap: Map<string, DictEntry[]> | null = null;
let cedictLoadPromise: Promise<void> | null = null;
let cvdictLoadPromise: Promise<void> | null = null;

function buildEntries(data: Record<string, RawEntry[]>, source: DictSource): Map<string, DictEntry[]> {
  const map = new Map<string, DictEntry[]>();
  for (const [key, entries] of Object.entries(data)) {
    map.set(
      key,
      entries.map((e) => ({
        traditional: e.t,
        pinyin: e.p,
        definitions: e.d,
        source,
      }))
    );
  }
  return map;
}

async function loadCedict(): Promise<void> {
  if (cedictMap) return;
  if (cedictLoadPromise) return cedictLoadPromise;

  cedictLoadPromise = (async () => {
    const base = import.meta.env.BASE_URL;
    const resp = await fetch(`${base}dict/cedict.json`);
    const data: Record<string, RawEntry[]> = await resp.json();
    cedictMap = buildEntries(data, 'cedict');
  })();
  return cedictLoadPromise;
}

async function loadCvdict(): Promise<void> {
  if (cvdictMap) return;
  if (cvdictLoadPromise) return cvdictLoadPromise;

  cvdictLoadPromise = (async () => {
    const base = import.meta.env.BASE_URL;
    const resp = await fetch(`${base}dict/cvdict.json`);
    const data: Record<string, RawEntry[]> = await resp.json();
    cvdictMap = buildEntries(data, 'cvdict');
  })();
  return cvdictLoadPromise;
}

async function loadDict(): Promise<void> {
  await Promise.all([loadCedict(), loadCvdict()]);
}

let toSimplifiedFn: ((text: string) => string) | null = null;

async function ensureSimplifiedConverter(): Promise<(text: string) => string> {
  if (toSimplifiedFn) return toSimplifiedFn;
  const OpenCC = await import('opencc-js');
  toSimplifiedFn = OpenCC.Converter({ from: 'tw', to: 'cn' });
  return toSimplifiedFn;
}

function lookupInMap(map: Map<string, DictEntry[]> | null, word: string, simplified: string | null): DictEntry[] {
  if (!map) return [];
  const direct = map.get(word);
  if (direct) return direct;
  if (simplified && simplified !== word) {
    const result = map.get(simplified);
    if (result) return result;
  }
  return [];
}

export async function lookup(word: string): Promise<DictEntry[] | null> {
  await loadDict();

  // Pre-compute simplified form
  const toSimplified = await ensureSimplifiedConverter();
  const simplified = toSimplified(word);

  const cedictResults = lookupInMap(cedictMap, word, simplified);
  const cvdictResults = lookupInMap(cvdictMap, word, simplified);

  const combined = [...cedictResults, ...cvdictResults];
  return combined.length > 0 ? combined : null;
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
  return cedictMap !== null || cvdictMap !== null;
}

/** Load both dictionaries and the simplified converter. Call before sync hasEntry(). */
export async function ensureReady(): Promise<void> {
  await loadDict();
  await ensureSimplifiedConverter();
}

/** Sync check whether a word has a dictionary entry. Requires ensureReady() called first. */
export function hasEntry(word: string): boolean {
  const simplified = toSimplifiedFn ? toSimplifiedFn(word) : null;
  if (cedictMap) {
    if (cedictMap.has(word)) return true;
    if (simplified && simplified !== word && cedictMap.has(simplified)) return true;
  }
  if (cvdictMap) {
    if (cvdictMap.has(word)) return true;
    if (simplified && simplified !== word && cvdictMap.has(simplified)) return true;
  }
  return false;
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

/** Load dictionary entries from a .crdr bundle into the text cache for instant display.
 *  Does NOT replace the full dictionaries — they load normally for drill-down and future texts. */
export function loadFromBundle(entries: Record<string, RawEntry[]>): void {
  textCache = new Map();

  for (const [key, rawEntries] of Object.entries(entries)) {
    textCache.set(
      key,
      rawEntries.map((e) => ({
        traditional: e.t,
        pinyin: e.p,
        definitions: e.d,
        source: (e.s as DictSource) || 'cedict',
      }))
    );
  }
}

/** Export cached dictionary entries (for .crdr export) */
export function exportCache(): Record<string, RawEntry[]> | null {
  if (!textCache) return null;
  const result: Record<string, RawEntry[]> = {};
  for (const [word, entries] of textCache) {
    if (entries) {
      result[word] = entries.map((e) => ({
        t: e.traditional,
        p: e.pinyin,
        d: e.definitions,
        s: e.source,
      }));
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
