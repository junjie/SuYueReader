import type { DictSource } from '../types/index.ts';

const DICT_BASE_URL = import.meta.env.PROD
  ? 'https://cdn.jsdelivr.net/gh/junjie/SuYueReader@main/public/dict/'
  : `${import.meta.env.BASE_URL}dict/`;

export interface DictEntry {
  traditional: string;
  pinyin: string;
  definitions: string[];
  source: DictSource;
  bopomofo?: string;
  richDefinition?: string;
  synonyms?: string;
  antonyms?: string;
  crossRef?: string;
}

interface RawEntry {
  t: string;
  p: string;
  d: string[];
  s?: DictSource; // present in .crdr bundles with source info
  b?: string;     // bopomofo (moedict)
  rd?: string;    // rich definition text (moedict)
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
        ...(e.b ? { bopomofo: e.b } : {}),
        ...(e.rd ? { richDefinition: e.rd } : {}),
      }))
    );
  }
  return map;
}

async function loadCedict(): Promise<void> {
  if (cedictMap) return;
  if (cedictLoadPromise) return cedictLoadPromise;

  cedictLoadPromise = (async () => {
    const resp = await fetch(`${DICT_BASE_URL}cedict.json`);
    const data: Record<string, RawEntry[]> = await resp.json();
    cedictMap = buildEntries(data, 'cedict');
  })();
  return cedictLoadPromise;
}

async function loadCvdict(): Promise<void> {
  if (cvdictMap) return;
  if (cvdictLoadPromise) return cvdictLoadPromise;

  cvdictLoadPromise = (async () => {
    const resp = await fetch(`${DICT_BASE_URL}cvdict.json`);
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

// --- MOE Dictionary (chunked lazy-loading) ---

const NUM_MOEDICT_CHUNKS = 20;
const moedictChunks: Map<number, Map<string, DictEntry[] | string>> = new Map();
const moedictChunkPromises: Map<number, Promise<void>> = new Map();

interface MoedictRawEntry {
  p: string;  // pinyin
  b: string;  // bopomofo
  d?: string; // definition
  y?: string; // synonyms
  a?: string; // antonyms
  x?: string; // cross-ref
}

function moedictChunkId(word: string): number {
  return word.codePointAt(0)! % NUM_MOEDICT_CHUNKS;
}

async function loadMoedictChunk(chunkId: number): Promise<void> {
  if (moedictChunks.has(chunkId)) return;
  if (moedictChunkPromises.has(chunkId)) return moedictChunkPromises.get(chunkId)!;

  const promise = (async () => {
    const filename = `moedict-${String(chunkId).padStart(2, '0')}.json`;
    const resp = await fetch(`${DICT_BASE_URL}${filename}`);
    if (!resp.ok) {
      moedictChunks.set(chunkId, new Map());
      return;
    }
    const data: Record<string, MoedictRawEntry[] | string> = await resp.json();
    const map = new Map<string, DictEntry[] | string>();

    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'string') {
        // Alias: "→traditionalKey"
        map.set(key, value);
      } else {
        map.set(
          key,
          value.map((e) => ({
            traditional: key,
            pinyin: e.p || '',
            definitions: [], // definitions are in richDefinition
            source: 'moedict' as DictSource,
            bopomofo: e.b || '',
            richDefinition: e.d || '',
            synonyms: e.y || undefined,
            antonyms: e.a || undefined,
            crossRef: e.x || undefined,
          }))
        );
      }
    }

    moedictChunks.set(chunkId, map);
  })();

  moedictChunkPromises.set(chunkId, promise);
  return promise;
}

async function resolveFromChunk(chunkMap: Map<string, DictEntry[] | string>, key: string): Promise<DictEntry[] | null> {
  const value = chunkMap.get(key);
  if (!value) return null;
  if (typeof value === 'string') {
    // It's an alias like "→繁體key" — resolve the traditional key
    const tradKey = value.slice(1); // remove "→"
    const tradChunkId = moedictChunkId(tradKey);
    // Load the target chunk if needed (may be different from source chunk)
    await loadMoedictChunk(tradChunkId);
    const tradChunk = moedictChunks.get(tradChunkId);
    if (!tradChunk) return null;
    const tradValue = tradChunk.get(tradKey);
    if (!tradValue || typeof tradValue === 'string') return null;
    return tradValue;
  }
  return value;
}

async function lookupInMoedict(word: string, simplified: string | null): Promise<DictEntry[]> {
  // Load chunks for both word forms
  const cid1 = moedictChunkId(word);
  const promises = [loadMoedictChunk(cid1)];

  if (simplified && simplified !== word) {
    const cid2 = moedictChunkId(simplified);
    if (cid2 !== cid1) promises.push(loadMoedictChunk(cid2));
  }

  await Promise.all(promises);

  // Try word directly
  const chunk1 = moedictChunks.get(cid1);
  if (chunk1) {
    const result = await resolveFromChunk(chunk1, word);
    if (result) return result;
  }

  // Try simplified form
  if (simplified && simplified !== word) {
    const cid2 = moedictChunkId(simplified);
    const chunk2 = moedictChunks.get(cid2);
    if (chunk2) {
      const result = await resolveFromChunk(chunk2, simplified);
      if (result) return result;
    }
  }

  return [];
}

// We need settings access for moedict toggle — pass via lookup
let _showMoedict = false;
export function setMoedictEnabled(enabled: boolean): void {
  _showMoedict = enabled;
}

export async function lookup(word: string): Promise<DictEntry[] | null> {
  await loadDict();

  // Pre-compute simplified form
  const toSimplified = await ensureSimplifiedConverter();
  const simplified = toSimplified(word);

  const cedictResults = lookupInMap(cedictMap, word, simplified);
  const cvdictResults = lookupInMap(cvdictMap, word, simplified);
  const moedictResults = _showMoedict ? await lookupInMoedict(word, simplified) : [];

  const combined = [...cedictResults, ...cvdictResults, ...moedictResults];
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

/** Sync check whether a word has a dictionary entry. Requires ensureReady() called first.
 *  Note: does not check MoeDict (lazy-loaded chunks can't be checked synchronously). */
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
        ...(e.b ? { bopomofo: e.b } : {}),
        ...(e.rd ? { richDefinition: e.rd } : {}),
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
        ...(e.bopomofo ? { b: e.bopomofo } : {}),
        ...(e.richDefinition ? { rd: e.richDefinition } : {}),
      }));
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}
