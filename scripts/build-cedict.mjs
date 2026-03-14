#!/usr/bin/env node
/**
 * Download CC-CEDICT and convert to a compact JSON dictionary.
 *
 * Usage: node scripts/build-cedict.mjs
 *
 * Output: public/dict/cedict.json
 *
 * CC-CEDICT line format:
 *   Traditional Simplified [pin1 yin1] /definition 1/definition 2/
 */

import { createWriteStream, mkdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { pipeline } from 'stream/promises';
import { createGunzip } from 'zlib';
import { createInterface } from 'readline';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outDir = join(projectRoot, 'public', 'dict');
const outFile = join(outDir, 'cedict.json');
const cedictGz = join(outDir, 'cedict_ts.u8.gz');
const cedictTxt = join(outDir, 'cedict_ts.u8');

const CEDICT_URL =
  'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

// --- Numbered pinyin → tone-mark pinyin conversion ---

const TONE_MARKS = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

/**
 * Convert a single numbered pinyin syllable to tone-marked.
 * e.g. "nian2" → "nián", "lv4" → "lǜ", "r5" → "r"
 */
function numberToMark(syllable) {
  const match = syllable.match(/^([a-zA-Zü:]+?)(\d)$/);
  if (!match) return syllable; // no tone number, return as-is

  let [, base, tone] = match;
  tone = parseInt(tone, 10);

  // Handle u: → ü
  base = base.replace(/u:/g, 'ü').replace(/U:/g, 'Ü');

  // Tone 5 (neutral) = no mark
  if (tone === 5 || tone === 0) return base;

  const lower = base.toLowerCase();

  // Find which vowel gets the mark using standard rules:
  // 1. "a" or "e" always takes the mark
  // 2. "ou" → mark goes on "o"
  // 3. Otherwise, the last vowel takes the mark
  const vowels = 'aeiouü';
  let markIndex = -1;

  if (lower.includes('a')) {
    markIndex = lower.indexOf('a');
  } else if (lower.includes('e')) {
    markIndex = lower.indexOf('e');
  } else if (lower.includes('ou')) {
    markIndex = lower.indexOf('o');
  } else {
    // Last vowel
    for (let i = lower.length - 1; i >= 0; i--) {
      if (vowels.includes(lower[i])) {
        markIndex = i;
        break;
      }
    }
  }

  if (markIndex === -1) return base; // no vowel found (e.g. "m2" "r5")

  const vowelChar = lower[markIndex];
  const marked = TONE_MARKS[vowelChar]?.[tone - 1];
  if (!marked) return base;

  // Preserve original case
  const replacement = base[markIndex] === base[markIndex].toUpperCase()
    ? marked.toUpperCase()
    : marked;

  return base.slice(0, markIndex) + replacement + base.slice(markIndex + 1);
}

/**
 * Convert a full pinyin string like "nian2 qing1 ren2" → "nián qīng rén"
 */
function convertPinyin(pinyin) {
  return pinyin
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : numberToMark(part)))
    .join('');
}

async function downloadCedict() {
  if (existsSync(cedictTxt)) {
    console.log('Using cached cedict_ts.u8');
    return;
  }

  console.log('Downloading CC-CEDICT...');
  const resp = await fetch(CEDICT_URL);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

  // Save gzipped file
  const fileStream = createWriteStream(cedictGz);
  await pipeline(resp.body, fileStream);

  // Decompress
  console.log('Decompressing...');
  const gunzip = createGunzip();
  const outStream = createWriteStream(cedictTxt);
  await pipeline(createReadStream(cedictGz), gunzip, outStream);
}

const LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)]\s+\/(.+)\/\s*$/;

async function parseCedict() {
  const dict = {};
  const rl = createInterface({
    input: createReadStream(cedictTxt, 'utf-8'),
    crlfDelay: Infinity,
  });

  let count = 0;
  for await (const line of rl) {
    if (line.startsWith('#') || !line.trim()) continue;

    const m = LINE_RE.exec(line);
    if (!m) continue;

    const [, traditional, simplified, pinyin, defsRaw] = m;
    const definitions = defsRaw.split('/').filter(Boolean);

    const entry = {
      t: traditional,
      p: convertPinyin(pinyin),
      d: definitions,
    };

    if (!dict[simplified]) {
      dict[simplified] = [];
    }
    dict[simplified].push(entry);
    count++;
  }

  console.log(`Parsed ${count} entries`);
  return dict;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  await downloadCedict();
  const dict = await parseCedict();

  console.log(`Writing ${outFile}...`);
  await writeFile(outFile, JSON.stringify(dict), 'utf-8');

  const stats = new Blob([JSON.stringify(dict)]);
  console.log(`Done! Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
