#!/usr/bin/env node
/**
 * Download the MOE Revised Mandarin Dictionary (教育部重編國語辭典修訂本)
 * and convert to chunked JSON files for lazy-loading.
 *
 * Usage: node scripts/build-moedict.mjs
 *
 * Output: public/dict/moedict-00.json through moedict-19.json
 *
 * Source: https://language.moe.gov.tw (CC BY-ND 3.0 Taiwan)
 * The definition text content is preserved unmodified per license terms.
 */

import { mkdirSync, existsSync, unlinkSync } from 'fs';
import { writeFile } from 'fs/promises';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const outDir = join(projectRoot, 'public', 'dict');
const zipFile = join(outDir, 'moedict_official.zip');
const xlsxFile = join(outDir, 'dict_revised_2015_20251229.xlsx');

const MOE_URL =
  'https://language.moe.gov.tw/001/Upload/Files/site_content/M0001/respub/download/dict_revised_2015_20251229.zip';

const NUM_CHUNKS = 20;

/** Deterministic chunk ID from the first character's code point */
function chunkId(word) {
  return word.codePointAt(0) % NUM_CHUNKS;
}

async function downloadMoedict() {
  if (existsSync(xlsxFile)) {
    console.log('Using cached xlsx file');
    return;
  }

  if (!existsSync(zipFile)) {
    console.log('Downloading MOE dictionary zip...');
    const resp = await fetch(MOE_URL);
    if (!resp.ok) throw new Error(`Download failed: ${resp.status}`);
    const fileStream = createWriteStream(zipFile);
    await pipeline(resp.body, fileStream);
    console.log('Downloaded zip file');
  }

  console.log('Extracting xlsx...');
  execSync(`unzip -o "${zipFile}" "dict_revised_2015_20251229.xlsx" -d "${outDir}"`);
}

function cleanText(text) {
  if (!text) return '';
  return String(text)
    .replace(/_x000D_\n/g, '\n')
    .replace(/_x000D_/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim();
}

async function parseMoedict() {
  console.log('Reading xlsx (this may take a moment)...');
  const workbook = XLSX.readFile(xlsxFile);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Skip header row
  const dataRows = rows.slice(1);
  console.log(`Total rows: ${dataRows.length}`);

  // Group entries by headword (Traditional)
  // Col 0: 字詞名, Col 8: 注音一式, Col 11: 漢語拼音,
  // Col 13: 相似詞, Col 14: 相反詞, Col 15: 釋義, Col 16: 多音參見訊息
  const wordMap = new Map(); // headword → entries[]

  for (const row of dataRows) {
    const headword = String(row[0] || '').trim();
    if (!headword) continue;

    const pinyin = cleanText(row[11]);
    const bopomofo = cleanText(row[8]);
    const definition = cleanText(row[15]);
    const synonyms = cleanText(row[13]);
    const antonyms = cleanText(row[14]);
    const crossRef = cleanText(row[16]);

    if (!definition && !crossRef) continue;

    const entry = { p: pinyin, b: bopomofo };
    if (definition) entry.d = definition;
    if (synonyms) entry.y = synonyms;
    if (antonyms) entry.a = antonyms;
    if (crossRef) entry.x = crossRef;

    if (!wordMap.has(headword)) {
      wordMap.set(headword, []);
    }
    wordMap.get(headword).push(entry);
  }

  console.log(`Unique headwords: ${wordMap.size}`);
  return wordMap;
}

async function buildSimplifiedAliases(wordMap) {
  console.log('Building simplified Chinese aliases...');
  const OpenCC = await import('opencc-js');
  const toSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });

  const aliases = new Map(); // simplified → traditional headword
  for (const headword of wordMap.keys()) {
    const simplified = toSimplified(headword);
    if (simplified !== headword) {
      aliases.set(simplified, headword);
    }
  }

  console.log(`Simplified aliases: ${aliases.size}`);
  return aliases;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  await downloadMoedict();

  const wordMap = await parseMoedict();
  const aliases = await buildSimplifiedAliases(wordMap);

  // Distribute into chunks
  const chunks = Array.from({ length: NUM_CHUNKS }, () => ({}));

  for (const [headword, entries] of wordMap) {
    const cid = chunkId(headword);
    chunks[cid][headword] = entries;
  }

  // Add simplified aliases (string value = pointer to traditional key)
  for (const [simplified, traditional] of aliases) {
    const cid = chunkId(simplified);
    // Only add alias if the simplified form isn't already a headword
    if (!chunks[cid][simplified]) {
      chunks[cid][simplified] = `→${traditional}`;
    }
  }

  // Write chunk files
  let totalSize = 0;
  for (let i = 0; i < NUM_CHUNKS; i++) {
    const filename = `moedict-${String(i).padStart(2, '0')}.json`;
    const filepath = join(outDir, filename);
    const json = JSON.stringify(chunks[i]);
    await writeFile(filepath, json, 'utf-8');
    const size = new Blob([json]).size;
    totalSize += size;
    const entryCount = Object.keys(chunks[i]).length;
    console.log(`  ${filename}: ${entryCount} entries, ${(size / 1024).toFixed(0)} KB`);
  }

  console.log(`\nTotal: ${(totalSize / 1024 / 1024).toFixed(1)} MB across ${NUM_CHUNKS} chunks`);

  // Clean up downloaded files (keep chunks only)
  if (existsSync(zipFile)) unlinkSync(zipFile);
  if (existsSync(xlsxFile)) unlinkSync(xlsxFile);
  // Also clean up the license explanation xlsx if extracted
  const licenseXlsx = join(outDir, 'dict_revised_2015_20251229_-著作權說明.xlsx');
  if (existsSync(licenseXlsx)) unlinkSync(licenseXlsx);

  console.log('Done!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
