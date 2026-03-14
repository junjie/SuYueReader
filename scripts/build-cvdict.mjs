#!/usr/bin/env node
/**
 * Download CVDICT (Chinese-Vietnamese) and convert to a compact JSON dictionary.
 *
 * Usage: node scripts/build-cvdict.mjs
 *
 * Output: public/dict/cvdict.json
 *
 * CVDICT uses the same line format as CC-CEDICT:
 *   Traditional Simplified [pin1 yin1] /definition 1/definition 2/
 */

import { mkdirSync, existsSync } from 'fs';
import { writeFile } from 'fs/promises';
import { createInterface } from 'readline';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outDir = join(projectRoot, 'public', 'dict');
const outFile = join(outDir, 'cvdict.json');
const cvdictTxt = join(outDir, 'CVDICT.u8');

const CVDICT_URL =
  'https://raw.githubusercontent.com/ph0ngp/CVDICT/master/CVDICT.u8';

// --- Numbered pinyin → tone-mark pinyin conversion ---

const TONE_MARKS = {
  a: ['ā', 'á', 'ǎ', 'à'],
  e: ['ē', 'é', 'ě', 'è'],
  i: ['ī', 'í', 'ǐ', 'ì'],
  o: ['ō', 'ó', 'ǒ', 'ò'],
  u: ['ū', 'ú', 'ǔ', 'ù'],
  ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
};

function numberToMark(syllable) {
  const match = syllable.match(/^([a-zA-Zü:]+?)(\d)$/);
  if (!match) return syllable;

  let [, base, tone] = match;
  tone = parseInt(tone, 10);

  base = base.replace(/u:/g, 'ü').replace(/U:/g, 'Ü');

  if (tone === 5 || tone === 0) return base;

  const lower = base.toLowerCase();
  const vowels = 'aeiouü';
  let markIndex = -1;

  if (lower.includes('a')) {
    markIndex = lower.indexOf('a');
  } else if (lower.includes('e')) {
    markIndex = lower.indexOf('e');
  } else if (lower.includes('ou')) {
    markIndex = lower.indexOf('o');
  } else {
    for (let i = lower.length - 1; i >= 0; i--) {
      if (vowels.includes(lower[i])) {
        markIndex = i;
        break;
      }
    }
  }

  if (markIndex === -1) return base;

  const vowelChar = lower[markIndex];
  const marked = TONE_MARKS[vowelChar]?.[tone - 1];
  if (!marked) return base;

  const replacement = base[markIndex] === base[markIndex].toUpperCase()
    ? marked.toUpperCase()
    : marked;

  return base.slice(0, markIndex) + replacement + base.slice(markIndex + 1);
}

function convertPinyin(pinyin) {
  return pinyin
    .split(/(\s+)/)
    .map((part) => (/\s/.test(part) ? part : numberToMark(part)))
    .join('');
}

async function downloadCvdict() {
  if (existsSync(cvdictTxt)) {
    console.log('Using cached CVDICT.u8');
    return;
  }

  console.log('Downloading CVDICT...');
  const resp = await fetch(CVDICT_URL);
  if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);

  const fileStream = createWriteStream(cvdictTxt);
  await pipeline(resp.body, fileStream);
  console.log('Downloaded CVDICT.u8');
}

const LINE_RE = /^(\S+)\s+(\S+)\s+\[([^\]]+)]\s+\/(.+)\/\s*$/;

async function parseCvdict() {
  const dict = {};
  const rl = createInterface({
    input: createReadStream(cvdictTxt, 'utf-8'),
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
  await downloadCvdict();
  const dict = await parseCvdict();

  console.log(`Writing ${outFile}...`);
  await writeFile(outFile, JSON.stringify(dict), 'utf-8');

  const stats = new Blob([JSON.stringify(dict)]);
  console.log(`Done! Size: ${(stats.size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
